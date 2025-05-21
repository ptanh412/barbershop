import mongoose from "mongoose";

export enum AppointmentStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    RESCHEDULED = "RESCHEDULED",
}

export interface IAppointment extends Document{
    customerId: mongoose.Types.ObjectId | string;
    shopId: mongoose.Types.ObjectId | string;
    services: string[];
    appointmentDate: Date;
    status: AppointmentStatus;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
    reminderSent: boolean;
    reminderTime?: Date
}