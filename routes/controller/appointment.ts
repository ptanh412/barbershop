import {Request, Response, NextFunction } from "express";
import { IUser } from "../../types/user";
import { Appointment } from "../../services/database/schema/appointment";
import { AppointmentStatus } from "../../types/appointment";

export class AppointmentController {
    static createAppointment = async (req: Request, res: Response, next: NextFunction) => {
        try{
            const authenticatedUsser = req.user as IUser;
            if (!authenticatedUsser) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const {shopId, services, appointmentDate, note} = req.body;

            if (!shopId || !services || !appointmentDate) {
                return res.status(400).json({ message: "Missing required fields" });
            }

            const apointmentDataObj = new Date(appointmentDate);

            if (isNaN(apointmentDataObj.getTime())) {
                return res.status(400).json({ message: "Invalid appointment date" });
            }

            const reminderTime = new Date(apointmentDataObj);
            reminderTime.setHours(reminderTime.getHours() - 1);

            const newAppointment = new Appointment({
                customerId: authenticatedUsser.id,
                shopId,
                services: Array.isArray(services) ? services : [services],
                appointmentDate: apointmentDataObj,
                note,
                reminderTime,
            });

            await newAppointment.save();

            res.status(201).json({
                message: "Appointment created successfully",
                appointment: newAppointment,
            });
        }catch (error) {
            next(error);
        }
    }

    static getAppointmentById = async (req: Request, res: Response, next: NextFunction) => {
        try{
            const authenticatedUsser = req.user as IUser;
            if (!authenticatedUsser) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const {id} = req.params;

            const appointment = await Appointment.findById(id).populate('shopId', 'shop_name address phone_number services').exec();

            if (!appointment) {
                return res.status(404).json({ message: "Appointment not found" });
            }

            if (appointment.customerId.toString() !== authenticatedUsser.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            res.status(200).json(appointment);
        }catch (error) {
            next(error);
        }
    }

    static getCustomerAppointments = async (req: Request, res: Response, next: NextFunction) => {
        try{
            const authenticatedUsser = req.user as IUser;
            if (!authenticatedUsser) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const {status} = req.query;
            let filter: any = {
                customerId: authenticatedUsser.id,
            }

            if (status && Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
                filter.status = status;
            }

            const appointments = await Appointment.find(filter).populate('shopId', 'shop_name address phone_number').sort({
                appointmentDate: -1
            }).exec();
            res.status(200).json(appointments);   
        }catch (error) {
            next(error);
        }
    };

    static updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction) => {
        try{
            const authenticatedUsser = req.user as IUser;
            if (!authenticatedUsser) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const {id} = req.params;
            const {status} = req.body;

            if (!status || !Object.values(AppointmentStatus).includes(status)) {
                return res.status(400).json({
                    message: "Invalid status",
                    validStatuses: Object.values(AppointmentStatus),
                 });
            }

            const appointment = await Appointment.findById(id);

            if (!appointment) {
                return res.status(404).json({ message: "Appointment not found" });
            }

            if (appointment.customerId.toString() !== authenticatedUsser.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            appointment.status = status;
            appointment.updatedAt = new Date();
            await appointment.save();

            res.status(200).json({
                message: "Appointment status updated successfully",
                appointment,
            });
        }catch (error) {
            next(error);
        }
    }

    static rescheduleAppointment = async (req: Request, res: Response, next: NextFunction) => {
        try{
            const authenticatedUsser = req.user as IUser;
            if (!authenticatedUsser) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const {id} = req.params;
            const {appointmentDate, services} = req.body;

            if (!appointmentDate) {
                return res.status(400).json({ message: "Missing required fields" });
            }
            const apointmentDataObj = new Date(appointmentDate);
            if (isNaN(apointmentDataObj.getTime())) {
                return res.status(400).json({ message: "Invalid appointment date" });
            }

            const appointment = await Appointment.findById(id);

            if (!appointment) {
                return res.status(404).json({ message: "Appointment not found" });
            }

            if (appointment.customerId.toString() !== authenticatedUsser.id) {
                return res.status(403).json({ message: "Forbidden" });
            }
            appointment.appointmentDate = apointmentDataObj;
            if (services) {
                appointment.services = Array.isArray(services) ? services : [services];
            }

            appointment.status = AppointmentStatus.RESCHEDULED;
            appointment.updatedAt = new Date();
            const reminderTime = new Date(apointmentDataObj);
            reminderTime.setHours(reminderTime.getHours() - 1);
            appointment.reminderTime = reminderTime;
            appointment.reminderSent = false;
            await appointment.save();

            res.status(200).json({
                message: "Appointment rescheduled successfully",
                appointment,
            });
        }catch (error) {
            next(error);
        }
    }

    static getPendingReminders = async (req: Request, res: Response, next: NextFunction) => {
        try{
            const now = new Date();
            const pendingReminders = await Appointment.find({
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

            res.status(200).json(pendingReminders);
        }catch (error) {
            next(error);
        }
    }

    static markReminderSent = async (req: Request, res: Response, next: NextFunction) => {
        try{
            const {id} = req.params;

            const appointment = await Appointment.findById(id);

            if (!appointment) {
                return res.status(404).json({ message: "Appointment not found" });
            }

            appointment.reminderSent = true;
            await appointment.save();

            res.status(200).json({
                message: "Reminder marked as sent successfully",
                appointment,
            });
        }catch (error) {
            next(error);
        }
    }
}