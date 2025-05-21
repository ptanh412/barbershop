import admin from "firebase-admin";
import { cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as dotenv from 'dotenv';
dotenv.config();


const app = admin.initializeApp({
    credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID as string,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL as string,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
});

export const firebaseAuth = getAuth(app);