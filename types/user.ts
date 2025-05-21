import { Roles } from "../enum/roles";
import { Document } from "mongoose";

export interface IUser extends Document {
  id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  password?: string;
  googleId?: string;
  firebaseUid?: string;
  role: Roles.CUSTOMER;
}
