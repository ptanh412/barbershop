import { NextFunction, Request, Response } from "express";
import { createBarber } from "../../lib/createBarber";
import { createBarberAndShop } from "../../lib/createBarberandShop";
import { IBarber } from "../../types/barber";
import shop from "../../services/database/schema/shop";
import { AppointmentStatus } from "../../types/appointment";
import { Appointment } from "../../services/database/schema/appointment";

export class BarberController {
  static newBarber = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let {
        username,
        password,
        email,
        phone_number,
        shop_name,
        address,
        latitude,
        longitude,
      } = req.body;
      latitude = parseFloat(latitude);
      longitude = parseFloat(longitude);

      const newShop = await createBarberAndShop(
        username,
        email,
        password,
        phone_number,
        shop_name,
        address,
        latitude,
        longitude
      );
      res.status(201).json(newShop);
    } catch (error) {
      next(error);
    }
  };

  static test = async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).type("json").send({ message: "test" });
  };
  static getAuthenticatedUser = async (req: Request, res: Response, next: NextFunction) => {
    const authenticatedUsser = req.user as IBarber;
    if (!authenticatedUsser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id, username, email } = authenticatedUsser;
    res.status(200).json({
      id,
      username,
      email,
    });
  }
  static createShopForBarber = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUsser = req.user as IBarber;
      console.log("Authenticated user:", authenticatedUsser);
      if (!authenticatedUsser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const existingShop = await shop.findOne({
        barberInfo: authenticatedUsser.id,
      });

      if (existingShop) {
        return res.status(400).json({ message: "Shop already exists" });
      }
      const {
        shop_name,
        phone_number,
        address,
        latitude,
        longitude,
        open_time,
        close_time,
        account_number,
        services
      } = req.body;

      console.log("Request body:", req.body);

      if (!shop_name || !address || !latitude || !longitude) {
        return res.status(400).json({ message: "Shop name, phone number, and address are required" });
      }

      const parsedLatitude = latitude ? parseFloat(latitude) : null;
      const parsedLongitude = longitude ? parseFloat(longitude) : null;

      const newBarberShop = new shop({
        barberInfo: authenticatedUsser.id,
        shop_name,
        phone_number,
        address,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        open_time,
        close_time,
        account_number,
        services: services || [],
        reviews: [],
      })
      await newBarberShop.save();
      res.status(201).json({
        message: "Shop created successfully",
        shop: newBarberShop,
      });
    } catch (error) {
      next(error);
    }
  }

  static getShopAppointments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUsser = req.user as IBarber;

      if (!authenticatedUsser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const barberShop = await shop.findOne({ barberInfo: authenticatedUsser.id });

      if (!barberShop) {
        return res.status(404).json({ message: "Barber shop not found" });
      }

      const { status, date } = req.query;

      let filter: any = { shopId: barberShop._id };

      if (status && Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
        filter.status = status;
      }

      if (date) {
        const searchDate = new Date(date as string);
        if (!isNaN(searchDate.getTime())) {
          const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
          const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));

          filter.apointmentDataObj = {
            $gte: startOfDay,
            $lte: endOfDay,
          }
        }
      }

      const appointments = await Appointment.find(filter)
        .populate('customerId', 'username email phoneNumber')
        .sort({
          appointmentDate: -1
        })
        .exec();

      res.status(200).json(appointments);
    } catch (error) {
      next(error);
    }
  }

  static getDailyAppointments = async (req: Request, res: Response, next: NextFunction) => {
    try{
      const authenticatedUsser = req.user as IBarber;

      if (!authenticatedUsser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const barberShop = await shop.findOne({ barberInfo: authenticatedUsser.id });

      if (!barberShop) {
        return res.status(404).json({ message: "Barber shop not found" });
      }

      const dateParam = req.params.date as string;
      const date = dateParam ?  new Date(dateParam) : new Date();
      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date" });
      }

      const startOfDay = new Date(date).setHours(0, 0, 0, 0);
      const endOfDay = new Date(date).setHours(23, 59, 59, 999);

      const appointments = await Appointment.find({
        shopId: barberShop._id,
        appointmentDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        status: {
          $in: [
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.RESCHEDULED,
          ]
        }
      })
        .populate('customerId', 'username email phoneNumber')
        .sort({
          appointmentDate: -1
        })
        .exec();

      res.status(200).json({
        date: date.toISOString().split('T')[0],
        appointments
      }); 
    }catch (error) {
      next(error);
    }
  }

  static updateAppointmentStatusByBarber = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUsser = req.user as IBarber;

      if (!authenticatedUsser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!status || !Object.values(AppointmentStatus).includes(status)) {
        return res.status(400).json({
          message: "Invalid status",
          validStatuses: Object.values(AppointmentStatus),
         });
      }

      const barberShop = await shop.findOne({barberInfo: authenticatedUsser.id });
      if (!barberShop) {
        return res.status(404).json({ message: "Barber shop not found" });
      }

      const appointment = await Appointment.findById(id);

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      if (appointment.shopId.toString() !== authenticatedUsser.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      appointment.status = status;
      appointment.updatedAt = new Date();
      await appointment.save();

      res.status(200).json({
        message: "Appointment status updated successfully",
        appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  static getShopServices = async (req: Request, res: Response, next: NextFunction) => {
    try{
      const authenticatedUsser = req.user as IBarber;

      if (!authenticatedUsser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const barberShop = await shop.findOne({ barberInfo: authenticatedUsser.id });

      if (!barberShop) {
        return res.status(404).json({ message: "Barber shop not found" });
      }
      res.status(200).json({
        shop_name: barberShop.shop_name,
        services: barberShop.services,
      });
    }catch (error) {
      next(error);
    }
  }
  
  static addShopServices = async (req: Request, res: Response, next: NextFunction) => {
    try{
      const authenticatedUsser = req.user as IBarber;

      if (!authenticatedUsser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { services } = req.body;

      if (!services || !Array.isArray(services)) {
        return res.status(400).json({ message: "Services must be an array" });
      }

      const barberShop = await shop.findOne({ barberInfo: authenticatedUsser.id });

      if (!barberShop) {
        return res.status(404).json({ message: "Barber shop not found" });
      }

      if (
        barberShop.services &&
        services.some((service: any) => (barberShop.services ?? []).includes(service))
      ) {
        return res.status(400).json({ message: "Some services already exist" });
      }

      if (!barberShop.services) {
        barberShop.services = [];
      }

      barberShop.services.push(...services);
      await barberShop.save();

      res.status(200).json({
        message: "Services added successfully",
        services: barberShop.services,
      });
    }catch (error) {
      next(error);
    }
  }

  static removeShopServices = async (req: Request, res: Response, next: NextFunction) => {
    try{
      const authenticatedUsser = req.user as IBarber;

      if (!authenticatedUsser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { serviceId } = req.body;

      const barberShop = await shop.findOne({ barberInfo: authenticatedUsser.id });

      if (!barberShop) {
        return res.status(404).json({ message: "Barber shop not found" });
      }

      if (!barberShop.services || !barberShop.services.includes(serviceId)) {
        return res.status(404).json({ message: "Barber service not found" });
      }

      barberShop.services = barberShop.services.filter(service => service !== serviceId);
      await barberShop.save();

      res.status(200).json({
        message: "Services removed successfully",
        services: barberShop.services,
      });
    }catch (error) {
      next(error);
    }
  }
}
