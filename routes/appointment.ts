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

router.put('/:id/cancel', jwtAuth, asyncHandler(AppointmentController.cancelAppointment));
router.get('/customer/stats', jwtAuth, asyncHandler(AppointmentController.getCustomerAppointmentStats));

router.get('/customer/monthly/:year/:month', jwtAuth, asyncHandler(AppointmentController.getMonthlyBreakdown));

// Get appointments trend for chart
router.get('/customer/trend', jwtAuth, asyncHandler(AppointmentController.getAppointmentTrend));


export { router as appointmentRouter };