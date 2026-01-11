import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface DecodedToken {
  id: string;
  iat: number;
  exp: number;
}
export interface AuthRequest extends Request {
  user: any; 
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  // Check if the "Authorization" header exists and starts with "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract the token
      token = req.headers.authorization.split(' ')[1];

      // Verify the Token
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;

      // Find the User
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
         res.status(401).json({ message: 'Not authorized, user not found' });
         return;
      }
      next();

    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};