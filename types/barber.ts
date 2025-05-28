import { Roles } from "../enum/roles";
import { Document } from "mongoose";

export interface IBarberShop extends Document {
  barberInfo: IBarber;
  services: IShopService[]; // Changed from string[] to IShopService[]
  shop_name: string;
  phone_number?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  open_time?: string;
  close_time?: string;
  account_number?: string;
  review?: string[];
}

export interface IBarber extends Document {
  id: string;
  username: string;
  email: string;
  role: Roles.BARBER;
  password?: string;
  googleId?: string;
  firebaseUid?: string;
}

// Define the shop service interface
export interface IShopService {
  _id: any;
  name: string;
  price: number;
  description?: string;
  duration?: number;
}
