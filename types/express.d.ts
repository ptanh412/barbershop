import { IUser } from './user';
import { IBarber } from './barber';

declare global {
  namespace Express {
    interface Request {
      user?: IUser | IBarber;
    }
  }
}

export {};
