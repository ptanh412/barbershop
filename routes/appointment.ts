import { Router } from "express";
import { jwtAuth } from "../middleware/jwtAuth";
import { asyncHandler } from "../middleware/asyncHandler";
import { AppointmentController } from "./controller/appointment";

const router = Router();

router.post("/", jwtAuth, asyncHandler(AppointmentController.createAppointment));

router.get("/:id", jwtAuth, asyncHandler(AppointmentController.getAppointmentById));

router.get("/customer/history", jwtAuth, asyncHandler(AppointmentController.getCustomerAppointments));

router.patch("/:id/status", jwtAuth, asyncHandler(AppointmentController.updateAppointmentStatus));

router.patch("/:id/reschedule", jwtAuth, asyncHandler(AppointmentController.rescheduleAppointment));

router.get("/reminders/pending", jwtAuth, asyncHandler(AppointmentController.getPendingReminders));

router.patch("/reminders/:id/mark-sent", jwtAuth, asyncHandler(AppointmentController.markReminderSent));

export { router as appointmentRouter };