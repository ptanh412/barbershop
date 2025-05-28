import mongoose, { Document, Schema } from "mongoose";

export interface IServiceTemplate extends Document {
  name: string;
  defaultPrice: number;
  description: string;
  duration: number;
  category: string;
}

// Schema for service templates
const serviceTemplateSchema = new Schema({
  name: { type: String, required: true },
  defaultPrice: { type: Number, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true }, // in minutes
  category: { type: String, required: true }
});

export const ServiceTemplate = mongoose.model<IServiceTemplate>("ServiceTemplate", serviceTemplateSchema);