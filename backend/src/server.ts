import mongoose from 'mongoose';

import { app } from './app.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/secure-files';
const PORT = process.env.PORT || 4000;

async function start() {
  await mongoose.connect(MONGO_URI);
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on port ${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err);
  process.exit(1);
});


