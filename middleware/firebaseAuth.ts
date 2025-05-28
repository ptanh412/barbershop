import { Request, NextFunction, Response } from "express";
import { Customer } from "../services/database/schema/customer"; // Assuming you have ICustomer
import { v4 as uuidv4 } from 'uuid';
import { ClientError } from "./exception/clientError";
import { IUser } from "../types/user";
import { firebaseAuth } from "../services/firebase/firebase-admin";

export const firebaseAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Lấy token từ header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ClientError('Unauthorized: No token provided'));
    }
    console.log('Authorization Header:', authHeader); // Log the header for debugging
    const idToken = authHeader.split('Bearer ')[1];
    console.log('ID Token:', idToken); // Log the token for debugging

    try {
      // Xác thực token với Firebase Admin
      const decodedToken = await firebaseAuth.verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // Tìm user trong database bằng firebaseUid
      let user = await Customer.findOne({ firebaseUid: uid });

      if (!user) {
        // Nếu không tìm thấy user bằng firebaseUid, kiểm tra bằng email
        const email = decodedToken.email;
        if (email) {
          user = await Customer.findOne({ email });

          if (user) {
            // Nếu tìm thấy user bằng email, cập nhật firebaseUid
            user.firebaseUid = uid;
            // Nếu user đăng nhập bằng Google, lưu Google ID nếu chưa có
            if (decodedToken.firebase.sign_in_provider === 'google.com' && !user.googleId) {
              const googleId = decodedToken.firebase.identities['google.com']?.[0];
              if (googleId) {
                user.googleId = googleId;
              }
            }
            await user.save();
          } else {
            // Nếu không tìm thấy user, tạo user mới
            let username = '';

            // Tạo username từ tên hoặc email
            if (decodedToken.name) {
              username = decodedToken.name.toLowerCase().replace(/\s+/g, '_');
            } else if (email) {
              username = email.split('@')[0];
            } else {
              username = `user_${uid.substring(0, 8)}`;
            }

            // Kiểm tra username đã tồn tại chưa
            const existingUsername = await Customer.findOne({ username });
            if (existingUsername) {
              // Nếu username đã tồn tại, thêm số ngẫu nhiên vào cuối
              username = `${username}_${Math.floor(Math.random() * 1000)}`;
            }

            // Tạo user mới
            user = new Customer({
              id: uuidv4(),
              username,
              email,
              firebaseUid: uid,
              phoneNumber: decodedToken.phone_number || undefined,
              role: 'CUSTOMER',
            });

            // Nếu đăng nhập bằng Google, lưu Google ID
            if (decodedToken.firebase.sign_in_provider === 'google.com') {
              const googleId = decodedToken.firebase.identities['google.com']?.[0];
              if (googleId) {
                user.googleId = googleId;
              }
            }

            await user.save();
          }
        } else {
          return next(new ClientError('No email associated with this account'));
        }
      }

      // Gán user vào request để các route tiếp theo có thể sử dụng
      req.user = user as IUser;
      next(); // Crucially, call next() here to proceed to the route handler
    } catch (error) {
      console.error('Firebase auth error:', error);
      return next(new ClientError('Unauthorized: Invalid token'));
    }
  } catch (error) {
    next(error);
  }
};