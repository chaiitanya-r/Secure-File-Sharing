import request from 'supertest';
import { app } from '../src/app.js';
import { FileModel } from '../src/models/File.js';

async function registerAndLogin(email: string, password: string) {
  await request(app).post('/api/auth/register').send({ email, password });
  const loginRes = await request(app).post('/api/auth/login').send({ email, password });
  return loginRes.body.token as string;
}

describe('File encryption and ACL', () => {
  it('uploads files with unique AES keys and enforces ACL rules', async () => {
    const ownerToken = await registerAndLogin('owner@example.com', 'averysecurepassword');
    const guestToken = await registerAndLogin('guest@example.com', 'averysecurepassword');

    const uploadRes = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', Buffer.from('secret file content'), 'secret.txt');
    expect(uploadRes.status).toBe(201);

    const listRes = await request(app)
      .get('/api/files')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(listRes.body).toHaveLength(1);
    const fileId = listRes.body[0].id;

    const metadataRes = await request(app)
      .get(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(metadataRes.status).toBe(200);
    expect(metadataRes.body.encryptedAesKey).toBeDefined();

    // Share with guest via email
    const shareRes = await request(app)
      .post(`/api/files/${fileId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ targetUserEmail: 'guest@example.com' });
    expect(shareRes.status).toBe(200);

    const fileDoc = await FileModel.findById(fileId);
    expect(fileDoc?.acl).toHaveLength(2);
    const [ownerEntry, guestEntry] = fileDoc!.acl;
    expect(ownerEntry.encryptedAesKey).not.toEqual(guestEntry.encryptedAesKey);
    expect(fileDoc?.serverWrappedKey).toBeDefined();

    const guestMetadata = await request(app)
      .get(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${guestToken}`);
    expect(guestMetadata.status).toBe(200);

    const guestDownload = await request(app)
      .get(`/api/files/${fileId}/download`)
      .set('Authorization', `Bearer ${guestToken}`);
    expect(guestDownload.status).toBe(200);
    expect(guestDownload.headers['x-encrypted-key']).toBeDefined();

    const strangerToken = await registerAndLogin('stranger@example.com', 'averysecurepassword');
    const forbiddenRes = await request(app)
      .get(`/api/files/${fileId}/download`)
      .set('Authorization', `Bearer ${strangerToken}`);
    expect(forbiddenRes.status).toBe(403);
  });
});


