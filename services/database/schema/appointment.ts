import mongoose, {Schema} from "mongoose";
import { AppointmentStatus, IAppointment } from "../../../types/appointment";

const appointmentSchema = new Schema({
    customerId: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "Customer",
    },
    shopId:{
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "Shop",
    },
    services: [{
        type: String,
        required: true,
    }],
    appointmentDate: {
        type: Date,
        required: true,
    },
    status:{
        type: String,
        enum: Object.values(AppointmentStatus),
        default: AppointmentStatus.PENDING,
    },
    notes:{type: String},
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    reminderSent: {
        type: Boolean,
        default: false,
    },
    reminderTime: {
        type: Date,
    },
},{
    timestamps: true,
})

export const Appointment = mongoose.model<IAppointment>("Appointment", appointmentSchema);