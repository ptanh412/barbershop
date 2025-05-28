import { NextFunction, Request, Response } from "express";
import { firebaseAuth } from "../../services/firebase/firebase-admin";
import { Customer } from "../../services/database/schema/customer";
import { generateToken } from "../../services/auth/generateToken";
import { v4 as uuidv4 } from 'uuid';
import { Barber } from "../../services/database/schema/barber";
import shop from "../../services/database/schema/shop";


export class FirebaseAuthController {
    static verifyFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { idToken, userType } = req.body;

            console.log("ID Token:", idToken);
            console.log("User Type:", userType);

            if (!idToken) {
                return res.status(400).json({ message: "idToken is required" });
            }

            const decodedToken = await firebaseAuth.verifyIdToken(idToken);
            const uid = decodedToken.uid;
            const email = decodedToken.email || "";
            const name = decodedToken.name || email.split('@')[0] || "User";

            // Try to find existing user
            let user;
            let isNewUser = false;

            if (userType === "BARBER"){
                user = await Barber.findOne({
                    firebaseUid: uid
                });

                if (!user) {
                    const newUser = new Barber({
                        id: uuidv4(), // Generate a unique ID for the user
                        firebaseUid: uid,
                        email: email,
                        username: name,
                        password: Math.random().toString(36).slice(-8),
                        phoneNumber: "",
                        role: "BARBER"
                    });

                    user = await newUser.save();
                    isNewUser = true;
                    console.log("Created new barber:", user.id);
                }
                const barberShop = await shop.findOne({
                    barberId: user.id
                });

                const token = generateToken(user);

                return res.status(200).json({
                    message: isNewUser ? "New barber created" : "Authentication successful",
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role
                    },
                    isNewUser,
                    hasShopInfo: !!barberShop
                });
            }else {
                user = await Customer.findOne({
                    firebaseUid: uid
                });
                // If user doesn't exist, create a new one
                if (!user) {
                    const newUser = new Customer({
                        id: uuidv4(), // Generate a unique ID for the user
                        firebaseUid: uid,
                        email: email,
                        username: name,
                        // Generate a random password or set a default value if required
                        password: Math.random().toString(36).slice(-8),
                        // Set other required fields with default values
                        // phoneNumber: "",
                        role: "CUSTOMER"
                    });
    
                    user = await newUser.save();
                    console.log("Created new user:", user.id);
                }
    
                const token = generateToken(user);
    
                return res.status(200).json({
                    message: "Authentication successful",
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        } catch (error) {
            console.error("Firebase auth error:", error);
            next(error);
        }
    }
}