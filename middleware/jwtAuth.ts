import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Customer } from '../services/database/schema/customer';
import { Barber } from '../services/database/schema/barber';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}

export const jwtAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.header('Authorization');
        console.log('Auth header received:', authHeader);

        const token = authHeader?.replace('Bearer ', '');
        console.log('Extracted token:', token?.substring(0, 50) + '...');

        if (!token) {
            console.log('No token provided');
            res.status(401).json({ message: 'No token provided' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        console.log('Decoded JWT payload:', decoded);

        let user;

        // Tìm user theo các field có thể có trong JWT
        const possibleUserIds = [
            decoded.id,
            decoded.sub,
            decoded.userId,  // <- THÊM field này
            decoded._id      // <- THÊM field này nếu cần
        ].filter(Boolean); // Loại bỏ undefined/null values


        // Thử tìm user với từng ID có thể
        for (const userId of possibleUserIds) {
            console.log('Looking for user with id:', userId);
            user = await Customer.findOne({ id: userId }) ||
                await Barber.findOne({ id: userId });

            if (user) {
                console.log('User found with id:', userId);
                break;
            }
        }

        // Nếu không tìm thấy bằng id, thử tìm bằng firebaseUid
        if (!user && decoded.firebaseUid) {
            console.log('Looking for user with firebaseUid:', decoded.firebaseUid);
            user = await Customer.findOne({ firebaseUid: decoded.firebaseUid }) ||
                await Barber.findOne({ firebaseUid: decoded.firebaseUid });
        }

        if (!user) {
            console.log('User not found with id or firebaseUid');
            res.status(401).json({ message: 'Invalid token: User not found' });
            return;
        }        console.log('User found:', user.id, user.email, user.role);
        (req as any).user = user;
        next();

    } catch (error: any) {
        console.error('JWT Auth error:', error.message || error);
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({ message: 'Token has expired. Please log in again.' });
        } else if (error.name === 'JsonWebTokenError') {
            res.status(401).json({ message: 'Invalid token signature or malformed token.' });
        } else {
            res.status(401).json({ message: 'Invalid token.' });
        }
        return;
    }
};