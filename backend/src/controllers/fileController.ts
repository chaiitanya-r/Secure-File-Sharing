import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Readable } from 'stream';

import { FileModel } from '../models/File.js';
import { User, type IUser } from '../models/User.js';
import {
  aesEncrypt,
  generateAesKey,
  rsaEncryptAesKey
} from '../security/crypto.js';
import { wrapKey, unwrapKey } from '../security/keyWrap.js';
import { getGridFsBucket } from '../storage/gridfs.js';

function ensureObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('InvalidObjectId');
  }
}

export async function uploadFile(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'file field is required' });
  }

  const aesKey = generateAesKey();
  const mimeType = req.file.mimetype || 'application/octet-stream';
  const encrypted = aesEncrypt(req.file.buffer, aesKey);
  const encryptedBuffer = Buffer.from(encrypted.ciphertext, 'base64');
  const bucket = getGridFsBucket();
  const uploadStream = bucket.openUploadStream(req.file.originalname, {
    contentType: mimeType
  });
  await new Promise<void>((resolve, reject) => {
    Readable.from(encryptedBuffer)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve());
  });

  const wrapped = wrapKey(aesKey);
  const ownerEncryptedKey = rsaEncryptAesKey(aesKey, req.user.rsaPublicKey);

  const fileDoc = await FileModel.create({
    owner: req.user._id,
    filename: req.file.originalname,
    mimeType,
    size: req.file.size,
    gridFsId: uploadStream.id,
    aesIv: encrypted.iv,
    aesAuthTag: encrypted.authTag,
    serverWrappedKey: wrapped.ciphertext,
    serverWrapIv: wrapped.iv,
    serverWrapAuthTag: wrapped.authTag,
    acl: [
      {
        user: req.user._id,
        encryptedAesKey: ownerEncryptedKey
      }
    ]
  });

  res.status(201).json({
    id: fileDoc.id,
    filename: fileDoc.filename,
    mimeType: fileDoc.mimeType,
    size: fileDoc.size
  });
}

export async function listFiles(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const files = await FileModel.find({
    $or: [{ owner: req.user._id }, { 'acl.user': req.user._id }]
  }).sort({ createdAt: -1 });

  res.json(
    files.map((file) => ({
      id: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      isOwner: file.owner.equals(req.user!._id)
    }))
  );
}

export async function getFileMetadata(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    ensureObjectId(req.params.fileId);
  } catch {
    return res.status(400).json({ message: 'Invalid file id' });
  }
  const file = await FileModel.findById(req.params.fileId);
  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }
  const aclEntry = file.acl.find((entry) => entry.user.equals(req.user!._id));
  if (!aclEntry) {
    return res.status(403).json({ message: 'No access to file' });
  }
  res.json({
    id: file.id,
    filename: file.filename,
    mimeType: file.mimeType,
    size: file.size,
    aesIv: file.aesIv,
    aesAuthTag: file.aesAuthTag,
    encryptedAesKey: aclEntry.encryptedAesKey
  });
}

export async function downloadFile(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    ensureObjectId(req.params.fileId);
  } catch {
    return res.status(400).json({ message: 'Invalid file id' });
  }
  const file = await FileModel.findById(req.params.fileId);
  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }
  const aclEntry = file.acl.find((entry) => entry.user.equals(req.user!._id));
  if (!aclEntry) {
    return res.status(403).json({ message: 'No access to file' });
  }
  const bucket = getGridFsBucket();
  const safeName = encodeURIComponent(`${file.filename}.enc`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeName}`);
  res.setHeader('x-file-mime', file.mimeType);
  res.setHeader('x-aes-iv', file.aesIv);
  res.setHeader('x-aes-tag', file.aesAuthTag);
  res.setHeader('x-encrypted-key', aclEntry.encryptedAesKey);

  const downloadStream = bucket.openDownloadStream(file.gridFsId);
  downloadStream.on('error', () => res.status(500).end());
  downloadStream.pipe(res);
}

export async function shareFile(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    ensureObjectId(req.params.fileId);
    if (req.body.targetUserId) {
      ensureObjectId(req.body.targetUserId);
    }
  } catch {
    return res.status(400).json({ message: 'Invalid id format' });
  }
  const file = await FileModel.findById(req.params.fileId);
  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }
  const isOwner = file.owner.equals(req.user._id);
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'Only owner or admin can share' });
  }
  if (
    req.body.targetUserId &&
    file.acl.some((entry) => entry.user.equals(req.body.targetUserId))
  ) {
    return res.status(409).json({ message: 'User already has access' });
  }
  let targetUser: IUser | null = null;
  if (req.body.targetUserId) {
    targetUser = await User.findById(req.body.targetUserId);
  } else if (req.body.targetUserEmail) {
    targetUser = await User.findOne({ email: (req.body.targetUserEmail as string).toLowerCase() });
    if (targetUser) {
      const user = targetUser;
      const alreadyShared = file.acl.some((entry) => entry.user.equals(user._id));
      if (alreadyShared) {
        return res.status(409).json({ message: 'User already has access' });
      }
    }
  }
  if (!targetUser) {
    return res.status(404).json({ message: 'Target user not found' });
  }
  const aesKey = unwrapKey({
    ciphertext: file.serverWrappedKey,
    iv: file.serverWrapIv,
    authTag: file.serverWrapAuthTag
  });
  const encryptedAesKey = rsaEncryptAesKey(aesKey, targetUser.rsaPublicKey);
  file.acl.push({ user: targetUser._id, encryptedAesKey });
  await file.save();
  res.json({ message: 'Access granted' });
}


