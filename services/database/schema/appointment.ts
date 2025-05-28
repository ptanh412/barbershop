import mongoose, {Schema} from "mongoose";
import { AppointmentStatus, IAppointment } from "../../../types/appointment";

const appointmentServiceSchema = new Schema({
    serviceId: { type: Schema.Types.ObjectId, required: true },
    serviceName: { type: String, required: true },
    servicePrice: { type: Number, required: true },
    serviceDuration: { type: Number, required: true }
});

const appointmentSchema = new Schema({
    customerId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Customer', 
        required: true 
    },
    shopId: { 
        type: Schema.Types.ObjectId, 
        ref: 'BarberShop', 
        required: true 
    },
    services: [appointmentServiceSchema], // Lưu chi tiết service
    appointmentDate: { 
        type: Date, 
        required: true 
    },
    status: { 
        type: String, 
        enum: Object.values(AppointmentStatus), 
        default: AppointmentStatus.PENDING 
    },
    note: { 
        type: String 
    },
    reminderSent: { 
        type: Boolean, 
        default: false 
    },
    reminderTime: { 
        type: Date 
    },
    totalPrice: { 
        type: Number, 
        required: true 
    },
    totalDuration: { 
        type: Number, 
        required: true 
    }
}, {
    timestamps: true
});

export default mongoose.model<IAppointment>("Appointment", appointmentSchema);