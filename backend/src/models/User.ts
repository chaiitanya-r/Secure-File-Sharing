import mongoose, { Document, Schema } from 'mongoose';

export type Role = 'admin' | 'user';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: Role;
  rsaPublicKey: string; // PEM
  encryptedPrivateKey: string; // base64 of ciphertext
  privateKeySalt: string; // base64
  privateKeyIv: string; // base64
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    rsaPublicKey: { type: String, required: true },
    encryptedPrivateKey: { type: String, required: true },
    privateKeySalt: { type: String, required: true },
    privateKeyIv: { type: String, required: true }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);


