import { Request, Response, NextFunction } from "express";
import { IUser } from "../../types/user";
import appointment from "../../services/database/schema/appointment";
import { AppointmentStatus, IAppointmentService, IAppointmentStats, IMonthlyStats, IStatusDistribution } from "../../types/appointment";
import shop from "../../services/database/schema/shop";
import mongoose from "mongoose";


export class AppointmentController {
    static createAppointment = async (req: Request, res: Response, next: NextFunction) => {        try {
            const authenticatedUser = (req as any).user as unknown as IUser;
            console.log('Authenticated User:', authenticatedUser);
            if (!authenticatedUser) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const { shopId, services, appointmentDate, note } = req.body;

            if (!shopId || !services || !Array.isArray(services) || services.length === 0 || !appointmentDate) {
                return res.status(400).json({ message: "Missing required fields" });
            }

            const appointmentDateObj = new Date(appointmentDate);

            if (isNaN(appointmentDateObj.getTime())) {
                return res.status(400).json({ message: "Invalid appointment date" });
            }

            // Validate shop exists
            const barberShop = await shop.findById(shopId);
            if (!barberShop) {
                return res.status(404).json({ message: "Shop not found" });
            }

            // Validate and get service details
            const serviceDetails: IAppointmentService[] = [];
            let totalPrice = 0;
            let totalDuration = 0;

            for (const serviceId of services) {
                const service = barberShop.services.find(s => s._id?.toString() === serviceId);
                if (!service) {
                    return res.status(404).json({
                        message: `Service with ID ${serviceId} not found in this shop`
                    });
                }

                const serviceDetail: IAppointmentService = {
                    serviceId: service._id as string,
                    serviceName: service.name,
                    servicePrice: service.price,
                    serviceDuration: service.duration || 30
                };

                serviceDetails.push(serviceDetail);
                totalPrice += service.price;
                totalDuration += service.duration || 30;
            }

            // Check for appointment conflicts (optional)
            // Lưu ý: Nếu bạn muốn tất cả các cuộc hẹn mới đều là COMPLETED ngay lập tức,
            // thì việc kiểm tra xung đột thời gian với các cuộc hẹn PENDING/CONFIRMED có thể không cần thiết
            // hoặc cần được điều chỉnh logic phù hợp với mục đích sử dụng.
            // Hiện tại, tôi vẫn giữ đoạn kiểm tra này.
            const conflictingAppointment = await appointment.findOne({
                shopId,
                appointmentDate: {
                    $gte: new Date(appointmentDateObj.getTime() - (totalDuration * 60000)), // Start time overlap
                    $lt: new Date(appointmentDateObj.getTime() + (totalDuration * 60000))   // End time overlap
                },
                status: { $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] }
            });

            if (conflictingAppointment) {
                return res.status(409).json({
                    message: "Time slot is not available. Please choose a different time."
                });
            }

            const reminderTime = new Date(appointmentDateObj);
            reminderTime.setHours(reminderTime.getHours() - 1);

            const newAppointment = new appointment({
                customerId: authenticatedUser._id,
                shopId,
                services: serviceDetails,
                appointmentDate: appointmentDateObj,
                note: note?.trim() || undefined,
                reminderTime,
                totalPrice,
                totalDuration,
                status: AppointmentStatus.COMPLETED, // <-- THAY ĐỔI Ở ĐÂY
            });

            await newAppointment.save();

            // Populate customer and shop info for response
            await newAppointment.populate([
                { path: 'customerId', select: 'username email' },
                { path: 'shopId', select: 'shop_name address phone_number' }
            ]);

            res.status(201).json({
                message: "Appointment created successfully",
                appointment: newAppointment,
            });
        } catch (error) {
            next(error);
        }
    }    // Get appointment by ID
    static getAppointmentById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authenticatedUser = (req as any).user as unknown as IUser;
            if (!authenticatedUser) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const { id } = req.params;

            const appoint = await appointment.findById(id)
                .populate('shopId', 'shop_name address phone_number services')
                .exec();

            if (!appoint) {
                return res.status(404).json({ message: "Appointment not found" });
            }
            console.log('Authenticated User ID:', authenticatedUser._id);
            console.log('Appointment Customer ID:', appoint.customerId.toString());
            if (appoint.customerId.toString() !== authenticatedUser._id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            // Check if appointment can be cancelled
            if (appoint.status === AppointmentStatus.COMPLETED) {
                return res.status(400).json({ message: "Cannot cancel completed appointment" });
            }

            if (appoint.status === AppointmentStatus.CANCELLED) {
                return res.status(400).json({ message: "Appointment is already cancelled" });
            }

            // Check if cancellation is allowed (e.g., not too close to appointment time)
            const now = new Date();
            const appointmentTime = new Date(appoint.appointmentDate);
            const timeDifference = appointmentTime.getTime() - now.getTime();
            const hoursUntilAppointment = timeDifference / (1000 * 3600);

            // Allow cancellation only if appointment is more than 2 hours away
            if (hoursUntilAppointment < 2 && hoursUntilAppointment > 0) {
                return res.status(400).json({
                    message: "Cannot cancel appointment less than 2 hours before scheduled time"
                });
            }

            // Update appointment status
            appoint.status = AppointmentStatus.CANCELLED;
            appoint.updatedAt = new Date();


            await appoint.save();

            // Populate shop details for response
            await appoint.populate('shopId', 'shop_name address phone_number services');

            res.status(200).json({
                message: "Appointment cancelled successfully",
                appointment: appoint,
            });        } catch (error) {
            next(error);
        }
    };

    static getCustomerAppointments = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authenticatedUser = (req as any).user as unknown as IUser;
            if (!authenticatedUser) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const { status, page = 1, limit = 10, sortBy = 'appointmentDate', sortOrder = 'desc' } = req.query;

            let filter: any = {
                customerId: authenticatedUser._id,
            }

            // Add status filter if provided
            if (status && Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
                filter.status = status;
            }

            // Pagination
            const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

            // Sort configuration
            const sortConfig: any = {};
            // --- CHANGE START ---
            // Change default sortBy to 'createdAt' and ensure 'desc' for newest first
            const actualSortBy = (sortBy as string) === 'appointmentDate' ? 'createdAt' : (sortBy as string);
            sortConfig[actualSortBy] = sortOrder === 'asc' ? 1 : -1;
            // --- CHANGE END ---

            const appointments = await appointment.find(filter)
                .populate('shopId', 'shop_name address phone_number services')
                .populate('customerId', 'username email phoneNumber')
                .sort(sortConfig)
                .skip(skip)
                .limit(parseInt(limit as string))
                .exec();

            // Get total count for pagination
            const totalCount = await appointment.countDocuments(filter);
            const totalPages = Math.ceil(totalCount / parseInt(limit as string));

            console.log('Appointments:', JSON.stringify(appointments, null, 2));

            res.status(200).json({
                appointments,
                pagination: {
                    currentPage: parseInt(page as string),
                    totalPages,
                    totalCount,
                    hasNext: parseInt(page as string) < totalPages,
                    hasPrev: parseInt(page as string) > 1
                }
            });
        } catch (error) {
            next(error);
        }
    };    static updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authenticatedUsser = (req as any).user as unknown as IUser;
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

            const appoint = await appointment.findById(id);

            if (!appoint) {
                return res.status(404).json({ message: "Appointment not found" });
            }

            if (appoint.customerId.toString() !== authenticatedUsser.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            appoint.status = status;
            appoint.updatedAt = new Date();
            await appoint.save();

            res.status(200).json({
                message: "Appointment status updated successfully",
                appoint
            });        } catch (error) {
            next(error);
        }
    };

    static rescheduleAppointment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authenticatedUser = (req as any).user as unknown as IUser;
            if (!authenticatedUser) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const { id } = req.params;
            const { appointmentDate, services } = req.body;

            if (!appointmentDate) {
                return res.status(400).json({ message: "Appointment date is required" });
            }

            const appointmentDateObj = new Date(appointmentDate);
            if (isNaN(appointmentDateObj.getTime())) {
                return res.status(400).json({ message: "Invalid appointment date format" });
            }

            // Check if the new appointment date is in the future
            if (appointmentDateObj <= new Date()) {
                return res.status(400).json({ message: "Appointment date must be in the future" });
            }

            const appoint = await appointment.findById(id);

            if (!appoint) {
                return res.status(404).json({ message: "Appointment not found" });
            }

            // console.log('Authenticated User ID:', authenticatedUser._id);
            // console.log('Authenticated User ID (string):', authenticatedUser._id.toString());
            // console.log('Appointment Customer ID:', appoint.customerId);
            // console.log('Appointment Customer ID (string):', appoint.customerId.toString());

            // // FIX: So sánh cả hai giá trị dưới dạng string để tránh type mismatch
            // const authenticatedUserId = authenticatedUser._id.toString();
            // const appointmentCustomerId = appoint.customerId.toString();

            // if (authenticatedUserId !== appointmentCustomerId) {
            //     console.log('Permission denied - IDs do not match');
            //     console.log(`Expected: ${appointmentCustomerId}, Got: ${authenticatedUserId}`);
            //     return res.status(403).json({ message: "Forbidden" });
            // }

            // console.log('Permission granted - User owns this appointment');

            // Check if appointment can be rescheduled
            // if (appoint.status === AppointmentStatus.COMPLETED) {
            //     return res.status(400).json({ message: "Cannot reschedule completed appointment" });
            // }

            if (appoint.status === AppointmentStatus.CANCELLED) {
                return res.status(400).json({ message: "Cannot reschedule cancelled appointment" });
            }

            // Update appointment details
            appoint.appointmentDate = appointmentDateObj;
            if (services && Array.isArray(services) && services.length > 0) {
                // Validate and update services if provided
                appoint.services = services;

                // Recalculate total price and duration if services are updated
                let totalPrice = 0;
                let totalDuration = 0;

                for (const service of services) {
                    totalPrice += service.servicePrice || 0;
                    totalDuration += service.serviceDuration || 30;
                }

                appoint.totalPrice = totalPrice;
                appoint.totalDuration = totalDuration;
            }

            appoint.status = AppointmentStatus.RESCHEDULED;
            appoint.updatedAt = new Date();

            // Set reminder time (1 hour before appointment)
            const reminderTime = new Date(appointmentDateObj);
            reminderTime.setHours(reminderTime.getHours() - 1);
            appoint.reminderTime = reminderTime;
            appoint.reminderSent = false;

            await appoint.save();

            // Populate shop details for response
            await appoint.populate('shopId', 'shop_name address phone_number services');

            res.status(200).json({
                message: "Appointment rescheduled successfully",
                appointment: appoint,
            });
        } catch (error) {
            console.error('Error in rescheduleAppointment:', error);
            next(error);
        }
    }

    static getPendingReminders = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const now = new Date();
            const pendingReminders = await appointment.find({
                reminderSent: false,
                reminderTime: {
                    $lte: now,
                },
                appointmentDate: {
                    $gte: now,
                },
                status: {
                    $in: [
                        AppointmentStatus.PENDING,
                        AppointmentStatus.CONFIRMED
                    ]
                }
            }).populate('customerId', 'username email phoneNumber')
                .populate('shopId', 'shop_name address phone_number').exec();

            res.status(200).json(pendingReminders);        } catch (error) {
            next(error);
        }
    };
    static cancelAppointment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authenticatedUser = (req as any).user as unknown as IUser;
            if (!authenticatedUser) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const { id } = req.params;
            // const { reason } = req.body; // Optional cancellation reason

            const appoint = await appointment.findById(id);

            if (!appoint) {
                return res.status(404).json({ message: "Appointment not found" });
            }

            // if (appoint.customerId.toString() !== authenticatedUser._id) {
            //     return res.status(403).json({ message: "Forbidden" });
            // }
            // // Check if appointment can be cancelled
            // if (appoint.status === AppointmentStatus.COMPLETED) {
            //     return res.status(400).json({ message: "Cannot cancel completed appointment" });
            // }
            if (appoint.status === AppointmentStatus.CANCELLED) {
                return res.status(400).json({ message: "Appointment is already cancelled" });
            }
            // Check if cancellation is allowed (e.g., not too close to appointment time)
            const now = new Date();
            const appointmentTime = new Date(appoint.appointmentDate);
            const timeDifference = appointmentTime.getTime() - now.getTime();
            const hoursUntilAppointment = timeDifference / (1000 * 3600);
            // Allow cancellation only if appointment is more than 2 hours away
            if (hoursUntilAppointment < 2 && hoursUntilAppointment > 0) {
                return res.status(400).json({
                    message: "Cannot cancel appointment less than 2 hours before scheduled time"
                });
            }
            // Update appointment status
            appoint.status = AppointmentStatus.CANCELLED;
            appoint.updatedAt = new Date();
            await appoint.save();
            // Populate shop details for response
            await appoint.populate('shopId', 'shop_name address phone_number services');
            res.status(200).json({
                message: "Appointment cancelled successfully",
                appointment: appoint,
            });
        } catch (error) {
            next(error);
        }
    }    // Controller method for getting customer appointment statistics
    static getCustomerAppointmentStats = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authenticatedUser = (req as any).user as unknown as IUser;
            if (!authenticatedUser) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const { period = '12months' } = req.query; // 6months, 12months, all

            let dateFilter: any = {};
            const now = new Date();

            // Set date filter based on period
            if (period === '6months') {
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(now.getMonth() - 6);
                dateFilter = { appointmentDate: { $gte: sixMonthsAgo } };
            } else if (period === '12months') {
                const twelveMonthsAgo = new Date();
                twelveMonthsAgo.setMonth(now.getMonth() - 12);
                dateFilter = { appointmentDate: { $gte: twelveMonthsAgo } };
            }

            const filter = {
                customerId: authenticatedUser._id,
                ...dateFilter
            };

            // Get all appointments for the customer
            const appointments = await appointment.find(filter).exec();

            // Calculate total stats
            const totalAppointments = appointments.length;
            const completedAppointments = appointments.filter(apt => apt.status === AppointmentStatus.COMPLETED).length;
            const cancelledAppointments = appointments.filter(apt => apt.status === AppointmentStatus.CANCELLED).length;
            const totalSpent = appointments
                .filter(apt => apt.status === AppointmentStatus.COMPLETED)
                .reduce((sum, apt) => sum + apt.totalPrice, 0);

            // Calculate monthly statistics
            const monthlyStatsMap = new Map<string, { count: number; totalSpent: number; year: number; month: string }>();

            appointments.forEach(apt => {
                const date = new Date(apt.appointmentDate);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const monthName = date.toLocaleString('default', { month: 'short' });

                if (!monthlyStatsMap.has(monthKey)) {
                    monthlyStatsMap.set(monthKey, {
                        count: 0,
                        totalSpent: 0,
                        year: date.getFullYear(),
                        month: monthName
                    });
                }

                const stats = monthlyStatsMap.get(monthKey)!;
                stats.count++;
                if (apt.status === AppointmentStatus.COMPLETED) {
                    stats.totalSpent += apt.totalPrice;
                }
            });

            const monthlyStats: IMonthlyStats[] = Array.from(monthlyStatsMap.values())
                .sort((a, b) => {
                    if (a.year !== b.year) return a.year - b.year;
                    return new Date(`${a.month} 1, ${a.year}`).getMonth() - new Date(`${b.month} 1, ${b.year}`).getMonth();
                });

            // Calculate status distribution
            const statusCounts = new Map<AppointmentStatus, number>();
            Object.values(AppointmentStatus).forEach(status => {
                statusCounts.set(status, 0);
            });

            appointments.forEach(apt => {
                statusCounts.set(apt.status, statusCounts.get(apt.status)! + 1);
            });

            const statusDistribution: IStatusDistribution[] = Array.from(statusCounts.entries())
                .filter(([_, count]) => count > 0)
                .map(([status, count]) => ({
                    status,
                    count,
                    percentage: totalAppointments > 0 ? Math.round((count / totalAppointments) * 100) : 0
                }));

            // Calculate average bookings per month
            const monthsCount = monthlyStats.length || 1;
            const averageBookingsPerMonth = Math.round((totalAppointments / monthsCount) * 10) / 10;

            const stats: IAppointmentStats = {
                totalAppointments,
                completedAppointments,
                cancelledAppointments,
                monthlyStats,
                statusDistribution,
                totalSpent,
                averageBookingsPerMonth
            };

            res.status(200).json({
                success: true,
                data: stats,
                period: period
            });

        } catch (error) {
            console.error('Error getting customer appointment stats:', error);
            next(error);
        }
    };    // Add route for detailed monthly breakdown
    static getMonthlyBreakdown = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authenticatedUser = (req as any).user as unknown as IUser;
            if (!authenticatedUser) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const { year, month } = req.params;

            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

            const appointments = await appointment.find({
                customerId: authenticatedUser._id,
                appointmentDate: {
                    $gte: startDate,
                    $lte: endDate
                }
            })
                .populate('shopId', 'shop_name address')
                .sort({ appointmentDate: -1 })
                .exec();

            const dailyStats = new Map<string, number>();
            const services = new Map<string, number>();

            appointments.forEach(apt => {
                const day = apt.appointmentDate.getDate().toString();
                dailyStats.set(day, (dailyStats.get(day) || 0) + 1);

                apt.services.forEach(service => {
                    services.set(service.serviceName, (services.get(service.serviceName) || 0) + 1);
                });
            });

            res.status(200).json({
                success: true,
                data: {
                    appointments,
                    dailyStats: Array.from(dailyStats.entries()).map(([day, count]) => ({ day: parseInt(day), count })),
                    topServices: Array.from(services.entries())
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([name, count]) => ({ name, count }))
                }
            });

        } catch (error) {
            console.error('Error getting monthly breakdown:', error);
            next(error);
        }
    };

    static markReminderSent = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            const appoin = await appointment.findById(id);

            if (!appoin) {
                return res.status(404).json({ message: "Appointment not found" });
            }

            appoin.reminderSent = true;
            await appoin.save();

            res.status(200).json({
                message: "Reminder marked as sent successfully",
                appoin,
            });
        } catch (error) {
            next(error);
        }
    }    // Additional controller method for trend data
    static getAppointmentTrend = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authenticatedUser = (req as any).user as unknown as IUser;
            if (!authenticatedUser) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const { period = '6months' } = req.query;

            let monthsBack = 6;
            if (period === '12months') monthsBack = 12;
            if (period === '3months') monthsBack = 3;

            const pipeline: mongoose.PipelineStage[] = [ // Explicitly type the pipeline
                {
                    $match: {
                        customerId: new mongoose.Types.ObjectId(authenticatedUser._id),
                        appointmentDate: {
                            $gte: new Date(new Date().setMonth(new Date().getMonth() - monthsBack))
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$appointmentDate" },
                            month: { $month: "$appointmentDate" }
                        },
                        count: { $sum: 1 },
                        totalSpent: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$status", "COMPLETED"] },
                                    "$totalPrice",
                                    0
                                ]
                            }
                        },
                        completed: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0]
                            }
                        },
                        cancelled: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0]
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        year: "$_id.year",
                        month: "$_id.month",
                        monthName: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ["$_id.month", 1] }, then: "Jan" },
                                    { case: { $eq: ["$_id.month", 2] }, then: "Feb" },
                                    { case: { $eq: ["$_id.month", 3] }, then: "Mar" },
                                    { case: { $eq: ["$_id.month", 4] }, then: "Apr" },
                                    { case: { $eq: ["$_id.month", 5] }, then: "May" },
                                    { case: { $eq: ["$_id.month", 6] }, then: "Jun" },
                                    { case: { $eq: ["$_id.month", 7] }, then: "Jul" },
                                    { case: { $eq: ["$_id.month", 8] }, then: "Aug" },
                                    { case: { $eq: ["$_id.month", 9] }, then: "Sep" },
                                    { case: { $eq: ["$_id.month", 10] }, then: "Oct" },
                                    { case: { $eq: ["$_id.month", 11] }, then: "Nov" },
                                    { case: { $eq: ["$_id.month", 12] }, then: "Dec" }
                                ],
                                default: "Unknown"
                            }
                        },
                        count: 1,
                        totalSpent: 1,
                        completed: 1,
                        cancelled: 1
                    }
                },
                {
                    // Explicitly cast 1 to 1 | -1
                    $sort: { "year": 1 as 1 | -1, "month": 1 as 1 | -1 }
                }
            ];

            const trendData = await appointment.aggregate(pipeline);

            res.status(200).json({
                success: true,
                data: trendData,
                period: period
            });

        } catch (error) {
            console.error('Error getting appointment trend:', error);
            next(error);
        }
    };
}