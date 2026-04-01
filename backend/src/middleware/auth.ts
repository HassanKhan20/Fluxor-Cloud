import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('[FATAL] JWT_SECRET environment variable is not set');
        return res.status(500).json({ message: 'Server configuration error' });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Authentication required' });

    jwt.verify(token, jwtSecret, (err: any, user: any) => {
        if (err) return res.status(403).json({ message: 'Invalid or expired token' });
        // @ts-ignore
        req.user = user;
        next();
    });
};
