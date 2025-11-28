import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

let bucket: GridFSBucket | null = null;

export function getGridFsBucket(): GridFSBucket {
  if (!mongoose.connection.db) {
    throw new Error('Mongo database connection not ready');
  }
  if (!bucket) {
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'encryptedFiles'
    });
  }
  return bucket;
}


