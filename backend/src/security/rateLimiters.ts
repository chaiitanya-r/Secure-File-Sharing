import rateLimit from 'express-rate-limit';

export function createRateLimiters() {
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many login attempts. Please try again later.'
  });

  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many uploads from this IP. Please try again later.'
  });

  return { loginLimiter, uploadLimiter };
}


