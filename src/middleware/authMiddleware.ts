import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface DecodedToken {
  id: string;
  iat: number;
  exp: number;
}

export type AuthRequest = Request & { user?: any };

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log(`[Auth] Checking ${req.method} ${req.path}`);

  if (req.method === 'OPTIONS') {
    res.sendStatus(200); 
    return;
  }

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is missing in environment variables');
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401).json({ message: 'Not authorized, user not found' });
        return;
      }

      next(); 
      return;

    } catch (error) {
      console.error('[Auth Error]', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
      return;
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }
};