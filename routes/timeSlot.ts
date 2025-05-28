import { Router } from "express";
import { jwtAuth } from "../middleware/jwtAuth";
import { asyncHandler } from "../middleware/asyncHandler";
import { TimeSlotController } from "./controller/timeSlot";

const router = Router();

// Get available time slots for a shop on a specific date
router.get("/shop/:shopId/date/:date", jwtAuth, asyncHandler(TimeSlotController.getAvailableTimeSlots));

// Check availability of a specific time slot
router.get("/shop/:shopId/check", jwtAuth, asyncHandler(TimeSlotController.checkTimeSlotAvailability));

export { router as timeSlotRouter };
