import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

type TokenPayload = {
  id: string;
  role: string;
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'nexus_civic_secret') as TokenPayload;
    if (payload.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }
    
    (req as any).user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }
};
