import { NextFunction, Request, Response } from "express";
import { createUser } from "../../lib/createUser";
import { IUser } from "../../types/user";
import shop from "../../services/database/schema/shop";
import { Customer } from "../../services/database/schema/customer";
import { comparePassword, generateJwtToken } from "../../helpers/jwt";

export class CustomerController {
  static newCust = async (req: Request, res: Response, next: NextFunction) => {
    let { username, password, email, phoneNumber } = req.body;
    const user = await createUser(username, email, password, phoneNumber);
    res.status(201).type("json").send(user);
  };

  static test = async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).type("json").send({ message: "test" });
  };
  // Thêm method đăng nhập
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
      const customer = await Customer.findOne({ email });

      if (!customer) {
        return res.status(401).json({
          error: "Email hoặc mật khẩu không chính xác"
        });
      }

      // Kiểm tra mật khẩu
      // Giả sử đã có function comparePassword để so sánh mật khẩu đã mã hóa
      if (!customer.password) {
        return res.status(401).json({
          error: "Email hoặc mật khẩu không chính xác"
        });
      }
      const isPasswordValid = await comparePassword(password, customer.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          error: "Email hoặc mật khẩu không chính xác"
        });
      }

      // Tạo JWT token
      const token = generateJwtToken(customer);

      // Trả về thông tin người dùng và token
      return res.status(200).json({
        token,
        user: {
          id: customer.id,
          username: customer.username,
          email: customer.email,
          phoneNumber: customer.phoneNumber
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({
        error: "Lỗi server khi đăng nhập"
      });
    }
  };
  static updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUser = req.user as IUser;
      if (!authenticatedUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { username, email, phoneNumber } = req.body;

      // Validation
      if (!username || !email) {
        return res.status(400).json({
          error: "Tên và email là bắt buộc"
        });
      }

      // Kiểm tra email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: "Email không hợp lệ"
        });
      }

      // Kiểm tra phone number format nếu có
      if (phoneNumber && phoneNumber.trim() !== '') {
        const phoneRegex = /^[\d\-\s\+\(\)]+$/;
        if (!phoneRegex.test(phoneNumber)) {
          return res.status(400).json({
            error: "Số điện thoại không hợp lệ"
          });
        }
      }

      // Kiểm tra xem email đã tồn tại cho user khác chưa
      const existingCustomer = await Customer.findOne({
        email,
        _id: { $ne: authenticatedUser._id }
      });

      if (existingCustomer) {
        return res.status(400).json({
          error: "Email đã được sử dụng bởi tài khoản khác"
        });
      }

      // Kiểm tra xem username đã tồn tại cho user khác chưa
      const existingUsername = await Customer.findOne({
        username,
        _id: { $ne: authenticatedUser._id }
      });

      if (existingUsername) {
        return res.status(400).json({
          error: "Tên người dùng đã được sử dụng"
        });
      }

      // Cập nhật thông tin
      const updatedCustomer = await Customer.findByIdAndUpdate(
        authenticatedUser._id,
        {
          username: username.trim(),
          email: email.trim().toLowerCase(),
          phoneNumber: phoneNumber ? phoneNumber.trim() : ''
        },
        {
          new: true, // Trả về document sau khi update
          runValidators: true // Chạy validation
        }
      ).select('-password');

      if (!updatedCustomer) {
        return res.status(404).json({
          error: "Không tìm thấy người dùng"
        });
      }

      return res.status(200).json({
        message: "Cập nhật thông tin thành công",
        user: {
          id: updatedCustomer.id,
          username: updatedCustomer.username,
          email: updatedCustomer.email,
          phoneNumber: updatedCustomer.phoneNumber || ''
        }
      });

    } catch (error) {
      next(error);
    };
  }

  static getAuthenticatedUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUser = req.user as IUser;
      if (!authenticatedUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log('Getting user info for:', authenticatedUser.id, authenticatedUser.firebaseUid);

      // Tìm user (đã được verify trong middleware)
      const customer = authenticatedUser;

      if (!customer) {
        return res.status(404).json({ message: "User not found" });
      }

      // Trả về thông tin user
      const responseData = {
        id: customer.id || customer._id?.toString(),
        username: customer.username || '',
        email: customer.email || '',
        phoneNumber: customer.phoneNumber || '',
        firebaseUid: customer.firebaseUid || null,
        role: customer.role
      };

      console.log('Returning user data:', responseData);
      res.status(200).json(responseData);
    } catch (error) {
      console.error("Get authenticated user error:", error);
      return res.status(500).json({
        error: "Lỗi server khi lấy thông tin người dùng"
      });
    }
  };

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
    try {
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
    } catch (error) {
      next(error);
    }
  }
}
