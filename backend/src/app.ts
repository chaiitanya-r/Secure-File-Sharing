import dotenv from 'dotenv';
dotenv.config();

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { filesRouter } from './routes/files.js';
import { createRateLimiters } from './security/rateLimiters.js';

const app = express();

app.use(helmet());
// CORS: Allow frontend origin (default to Vite dev server)
const corsOrigin = process.env.CORS_ORIGIN || 'http://127.0.0.1:3000';
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const { loginLimiter, uploadLimiter } = createRateLimiters();

app.use('/api/auth/login', loginLimiter);
app.use('/api/files/upload', uploadLimiter);

app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

export { app };


