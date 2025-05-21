import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { IUser } from '../types/user';
import { ClientError } from './exception/clientError';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}

export const jwtAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const token = authHeader.split('Bearer ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET as string) as unknown as IUser; // Cast to unknown first, then IUser
            req.user = decoded;
            next();
        } catch (error) {
            console.error('JWT verification error:', error);
            return next(new ClientError('Unauthorized: Invalid token'));
        }
    } catch (error) {
        console.error('JWT Authentication Error:', error);
        res.status(401).json({ message: 'Unauthorized' });
    }
}