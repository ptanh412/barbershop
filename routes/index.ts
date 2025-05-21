import { Router } from "express";
import { customerRouter } from "./customer";
import { barberRouter } from "./barber";
import { appointmentRouter } from "./appointment";
const routes = Router();

routes.use("/customer", customerRouter);
routes.use("/barber", barberRouter);
routes.use("/appointment", appointmentRouter);

export { routes }
