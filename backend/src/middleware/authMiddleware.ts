import { NextFunction, Request, Response } from 'express';
import { verifyJwt } from '../security/jwt.js';
import { User } from '../models/User.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }
  const token = header.split(' ')[1];
  const payload = verifyJwt(token);
  if (!payload) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  const user = await User.findById(payload.sub);
  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }
  req.user = user;
  next();
}

export function requireRoles(roles: Array<'admin' | 'user'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient role' });
    }
    next();
  };
}


