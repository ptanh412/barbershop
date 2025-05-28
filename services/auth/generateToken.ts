import { IUser } from "../../types/user";
import jwt from "jsonwebtoken";
import config  from "../../config/auth";
import { IBarber } from "../../types/barber";

export const generateToken = (user: IUser | IBarber): string => {
    const payload = {
        id: user.id,           // Thêm id vào payload
        sub: user.id,          // Giữ sub như cũ
        email: user.email,
        role: user.role,
        firebaseUid: user.firebaseUid || null  // Thêm firebaseUid
    };

    if (!config.jwt.secret) {
        throw new Error("JWT secret is not defined in the configuration.");
    }

    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: "1h",
        audience: config.jwt.audience,
        issuer: config.jwt.issuer,
    });
}