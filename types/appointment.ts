import mongoose from "mongoose";

export enum AppointmentStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    RESCHEDULED = "RESCHEDULED",
}

export interface IAppointmentService {
    serviceId: mongoose.Types.ObjectId | string;
    serviceName: string;
    servicePrice: number;
    serviceDuration: number; // in minutes
}

export interface IAppointment extends Document {
    customerId: mongoose.Types.ObjectId | string;
    shopId: mongoose.Types.ObjectId | string;
    services: IAppointmentService[]; // Lưu chi tiết service để tránh việc join data
    appointmentDate: Date;
    status: AppointmentStatus;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
    reminderSent: boolean;
    reminderTime?: Date;
    totalPrice: number; // Tổng giá tiền
    totalDuration: number; // Tổng thời gian
}

export interface IAppointmentStats {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    monthlyStats: IMonthlyStats[];
    statusDistribution: IStatusDistribution[];
    totalSpent: number;
    averageBookingsPerMonth: number;
}

export interface IMonthlyStats {
    month: string;
    year: number;
    count: number;
    totalSpent: number;
}

export interface IStatusDistribution {
    status: AppointmentStatus;
    count: number;
    percentage: number;
}