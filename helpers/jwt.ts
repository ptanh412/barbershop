import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    // Sử dụng bcrypt để so sánh mật khẩu
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

// Helper function để tạo JWT token
function generateJwtToken(user: any): string {
  // Sử dụng jsonwebtoken để tạo token
  return jwt.sign(
    {
      _id: user._id,        // Sử dụng _id để consistent với MongoDB
      userId: user.id,     // Giữ userId cho backward compatibility
      email: user.email,
      role: 'CUSTOMER' // Hoặc 'BARBER' tùy thuộc vào loại người dùng
    },
    process.env.JWT_SECRET || 'your-default-secret-key',
    {
      expiresIn: '24h' // Token hết hạn sau 24 giờ
    }
  );
}

export { comparePassword, generateJwtToken };