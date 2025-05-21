import { NextFunction, Request, Response } from "express";
import { createUser } from "../../lib/createUser";
import { IUser } from "../../types/user";
import shop from "../../services/database/schema/shop";

export class CustomerController {
  static newCust = async (req: Request, res: Response, next: NextFunction) => {
    let { username, password, email, phoneNumber } = req.body;
    const user = await createUser(username, email, password, phoneNumber);
    res.status(201).type("json").send(user);
  };

  static test = async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).type("json").send({ message: "test" });
  };

  static getAuthenticatedUser = async (req: Request, res: Response, next: NextFunction) => {
    const authenticatedUsser = req.user as IUser;
    if (!authenticatedUsser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id, username, email, phoneNumber } = authenticatedUsser;
    res.status(200).json({
      id,
      username,
      email,
      phoneNumber,
    });
  }

  static getAllBarberShops = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUsser = req.user as IUser;
      if (!authenticatedUsser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { search, sort, limit = '10', page = '1' } = req.query;

      const filter: any = {};

      if (search) {
        filter.$or = [
          { shop_name: { $regex: search, $options: 'i' } },
          { address: { $regex: search, $options: 'i' } },
        ]
      }

      let sortOptions: any = {};

      if (sort == 'name') {
        sortOptions.shop_name = 1;
      } else {
        sortOptions.createdAt = -1;
      }

      const limitNum = parseInt(limit as string);
      const pageNum = parseInt(page as string);
      const skip = (pageNum - 1) * limitNum;

      const total = await shop.countDocuments(filter);

      const shops = await shop.find(filter)
        .select('shop_name address phone_number latitude longitude services open_time close_time')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .exec();

      res.status(200).json({
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        data: shops,
      })
    } catch (error) {
      next(error);
    }
  }

  static getBarberShopById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUsser = req.user as IUser;
      if (!authenticatedUsser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      console.log("Id", id);

      const barberShop = await shop.findById(id)
        .select('shop_name address phone_number latitude longitude services open_time close_time')
        .exec();

      if (!barberShop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      res.status(200).json(barberShop);
    } catch (error) {
      next(error);
    }
  }

  static getBarberShopServices = async (req: Request, res: Response, next: NextFunction) => {
    try{
      const authenticatedUser = req.user as IUser;
      if (!authenticatedUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;

      const barberShop = await shop.findById(id)
      .select('shop_name services')
      .exec();

      if (!barberShop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      res.status(200).json({
        shop_name: barberShop.shop_name,
        services: barberShop.services,
      })
    }catch (error) {
        next(error);
    }
  }
}
