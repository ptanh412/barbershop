import { Router } from "express";
import { customerRouter } from "./customer";
import { barberRouter } from "./barber";
import { appointmentRouter } from "./appointment";
import { timeSlotRouter } from "./timeSlot";
const routes = Router();

routes.use("/customer", customerRouter);
routes.use("/barber", barberRouter);
routes.use("/appointment", appointmentRouter);
routes.use("/timeslot", timeSlotRouter);

export { routes }
