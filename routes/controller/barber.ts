import { NextFunction, Request, Response } from "express";
import { createBarber } from "../../lib/createBarber";
import { createBarberAndShop } from "../../lib/createBarberandShop";
import { IBarber } from "../../types/barber";
import shop from "../../services/database/schema/shop";
import { AppointmentStatus } from "../../types/appointment";
import appointment from "../../services/database/schema/appointment";
import { Barber } from "../../services/database/schema/barber";
import { comparePassword, generateJwtToken } from "../../helpers/jwt";
import { ServiceTemplate } from "../../types/serviceTemplate";
import { generateToken } from "../../services/auth/generateToken";

export class BarberController {
  static newBarber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { username, password, email } = req.body;

    // Tạo barber mới
    const newBarber = await createBarber(username, email, password);
    
    // Tạo token cho barber vừa tạo
    const token = generateToken(newBarber);
    
    // Trả về response bao gồm token và thông tin user
    res.status(201).json({
      message: "Barber created successfully",
      token: token,
      user: {
        id: newBarber.id,
        username: newBarber.username,
        email: newBarber.email,
        role: newBarber.role,
        firebaseUid: newBarber.firebaseUid
      }
    });
    
  } catch (error) {
    console.error("Error creating barber:", error);
    next(error);
  }
};
  static login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      // Kiểm tra nếu thiếu thông tin đăng nhập
      if (!email || !password) {
        return res.status(400).json({
          error: "Email và mật khẩu là bắt buộc"
        });
      }

      // Tìm người dùng theo email
      const barber = await Barber.findOne({ email });

      if (!barber) {
        return res.status(401).json({
          error: "Email hoặc mật khẩu không chính xác"
        });
      }

      // Kiểm tra mật khẩu
      // Giả sử đã có function comparePassword để so sánh mật khẩu đã mã hóa
      if (!barber.password) {
        return res.status(401).json({
          error: "Email hoặc mật khẩu không chính xác"
        });
      }
      const isPasswordValid = await comparePassword(password, barber.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          error: "Email hoặc mật khẩu không chính xác"
        });
      }

      // Tạo JWT token
      const token = generateJwtToken(barber);

      // Trả về thông tin người dùng và token
      return res.status(200).json({
        token,
        user: {
          id: barber.id,
          username: barber.username,
          email: barber.email,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({
        error: "Lỗi server khi đăng nhập"
      });
    }
  };
  static test = async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).type("json").send({ message: "test" });
  };
    static getAuthenticatedUser = async (req: Request, res: Response, next: NextFunction) => {
    const authenticatedUser = (req as any).user as unknown as IBarber;
    if (!authenticatedUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id, username, email } = authenticatedUser;
    res.status(200).json({
      id,
      username,
      email,
    });
  };
    static createShopForBarber = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUser = (req as any).user as unknown as IBarber;
      console.log("Authenticated user:", authenticatedUser);
      if (!authenticatedUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const existingShop = await shop.findOne({
        "barberInfo.id": authenticatedUser.id,
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
        return res.status(400).json({ message: "Shop name, address, and location are required" });
      }

      // Validate services format
      if (services && Array.isArray(services)) {
        for (const service of services) {
          if (!service.name || typeof service.price !== 'number') {
            return res.status(400).json({
              message: "Each service must include a name and price"
            });
          }
        }
      }

      const parsedLatitude = latitude ? parseFloat(latitude) : null;
      const parsedLongitude = longitude ? parseFloat(longitude) : null;

      const newBarberShop = new shop({
        barberInfo: {
          id: authenticatedUser.id,
          username: authenticatedUser.username,
          email: authenticatedUser.email,
          password: authenticatedUser.password,
          role: authenticatedUser.role
        },
        shop_name,
        phone_number,
        address,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        open_time,
        close_time,
        account_number,
        services: services || [],
        review: [],
      });

      await newBarberShop.save();

      res.status(201).json({
        message: "Shop created successfully",
        shop: newBarberShop,
      });
    } catch (error) {
      console.error("Error creating shop:", error);
      next(error);
    }
  }
  // Controller method to get default service templates
  static getServiceTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const serviceTemplates = await ServiceTemplate.find({});
      res.status(200).json({
        success: true,
        count: serviceTemplates.length,
        serviceTemplates
      });    } catch (error) {
      console.error("Error getting service templates:", error);
      next(error);
    }
  };  static getShopAppointments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUser = (req as any).user as unknown as IBarber;

      if (!authenticatedUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const barberShop = await shop.findOne({ "barberInfo.id": authenticatedUser.id });

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
          filter.appointmentDate = {
            $gte: startOfDay,
            $lte: endOfDay,
          }
        }
      }

      const appointments = await appointment.find(filter)
        .populate('customerId', 'username email phoneNumber')
        .sort({
          appointmentDate: -1
        })
        .exec();
    res.status(200).json(appointments);
    } catch (error) {
      next(error);
    }
  };
  static getDailyAppointments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUser = (req as any).user as unknown as IBarber;      if (!authenticatedUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const barberShop = await shop.findOne({ "barberInfo.id": authenticatedUser.id });

      if (!barberShop) {
        return res.status(404).json({ message: "Barber shop not found" });
      }

      const dateParam = req.params.date as string;
      const date = dateParam ? new Date(dateParam) : new Date();
      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }

      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date" });
      }

      const startOfDay = new Date(date).setHours(0, 0, 0, 0);
      const endOfDay = new Date(date).setHours(23, 59, 59, 999);

      const appointments = await appointment.find({
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
    } catch (error) {
      next(error);
    }
  }
  static updateAppointmentStatusByBarber = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUsser = (req as any).user as unknown as IBarber;

      if (!authenticatedUsser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { status } = req.body;      if (!status || !Object.values(AppointmentStatus).includes(status)) {
        return res.status(400).json({
          message: "Invalid status",
          validStatuses: Object.values(AppointmentStatus),
        });
      }

      const barberShop = await shop.findOne({ "barberInfo.id": authenticatedUsser.id });
      if (!barberShop) {
        return res.status(404).json({ message: "Barber shop not found" });
      }

      const appointments = await appointment.findById(id);      if (!appointments) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      if (appointments.shopId.toString() !== barberShop._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }

      appointments.status = status;
      appointments.updatedAt = new Date();
      await appointments.save();      res.status(200).json({
        message: "Appointment status updated successfully",
        appointments,
      });
    } catch (error) {
      next(error);
    }
  }
  static getShopServices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUsser = (req as any).user as unknown as IBarber;

      if (!authenticatedUsser) {
        return res.status(401).json({ message: "Unauthorized" });
      }      const barberShop = await shop.findOne({ "barberInfo.id": authenticatedUsser.id });

      if (!barberShop) {
        return res.status(404).json({ message: "Barber shop not found" });
      }
      res.status(200).json({
        shop_name: barberShop.shop_name,
        services: barberShop.services,
      });
    } catch (error) {
      next(error);
    }
  }
  static addShopServices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUsser = (req as any).user as unknown as IBarber;

      if (!authenticatedUsser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { services } = req.body;

      if (!services || !Array.isArray(services)) {
        return res.status(400).json({ message: "Services must be an array" });
      }      const barberShop = await shop.findOne({ "barberInfo.id": authenticatedUsser.id });

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
    } catch (error) {
      next(error);
    }
  }
  static removeShopServices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUsser = (req as any).user as unknown as IBarber;

      if (!authenticatedUsser) {
        return res.status(401).json({ message: "Unauthorized" });
      }      const { serviceId } = req.body;

      const barberShop = await shop.findOne({ "barberInfo.id": authenticatedUsser.id });

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
    } catch (error) {
      next(error);
    }
  }
}
