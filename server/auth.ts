import bcrypt from 'bcrypt';
import type { Request, Response, NextFunction } from 'express';

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Session user interface
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

// Authentication middleware
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.user) {
    return res.status(401).json({ 
      error: 'Authentifizierung erforderlich',
      code: 'AUTH_REQUIRED'
    });
  }
  next();
};

// Optional authentication - adds user info if logged in but doesn't require it
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  // User info is already available in req.session.user if logged in
  next();
};

// Admin auth middleware (preserves existing admin functionality)
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const adminSecret = process.env.ADMIN_SECRET || 'dev-secret';
  const authHeader = req.get('X-Admin-Secret');
  
  if (authHeader !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Utility to get current user from session
export const getCurrentUser = (req: Request): SessionUser | null => {
  return req.session?.user || null;
};

// Utility to set user in session
export const setSessionUser = (req: Request, user: SessionUser): void => {
  req.session.user = user;
};

// Utility to clear user session
export const clearSessionUser = (req: Request): Promise<void> => {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// User hash generation for anonymous reviews (backwards compatibility)
export const createUserHash = (req: Request): string => {
  const crypto = require('crypto');
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  return crypto.createHash('sha256').update(ip + userAgent).digest('hex');
};

// Extended Express session interface
declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}