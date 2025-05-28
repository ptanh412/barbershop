import { Roles } from "../enum/roles";
import { Barber } from "../services/database/schema/barber";
import BarberShop from "../services/database/schema/shop";
import { IBarberShop } from "../types/barber";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

export const createBarberAndShop = async (
    username: string,
    email: string,
    password: string,
    phoneNumber: string,
): Promise<IBarberShop> => {
    username = username.trim();
    email = email.trim();
    password = password.trim();
    phoneNumber = phoneNumber.trim();

    if (username.length === 0) throw new Error("Username cannot be empty");
    if (email.length === 0) throw new Error("Email cannot be empty");
    if (password.length === 0) throw new Error("Password cannot be empty");
    if (phoneNumber.length === 0) throw new Error("Phone number cannot be empty");

    const existingBarber = await Barber.findOne({
        $or: [
            {username},
            {email}
        ]
    });
    if (existingBarber) {
        if (existingBarber.username === username) {
            throw new Error("Username already exists");
        }
        if (existingBarber.email === email) {
            throw new Error("Email already exists");
        }
    }

    const hashPassword = await bcrypt.hash(password, 12);

    const newBarber = new Barber({
        id : uuidv4(),
        username,
        email,
        password: hashPassword,
        role: Roles.BARBER,
    });

    await newBarber.save();

    const newBarberShop = new BarberShop({
        barberInfo: newBarber._id,
        phone_number: phoneNumber,

        services: [],
        review: [],
    });

    await newBarberShop.save();

    return newBarberShop;
}