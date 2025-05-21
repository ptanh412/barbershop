import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { BarberController } from "./controller/barber";
import { FirebaseAuthController } from "./controller/firebaseAuth";
import { firebaseAuthMiddleware } from "../middleware/firebaseAuth";
import { jwtAuth } from "../middleware/jwtAuth";

const router = Router();

router.post("/signup", [], asyncHandler(BarberController.newBarber));
router.get("/", [], asyncHandler(BarberController.test));
// Routes mới cho Firebase Auth
router.post("/firebase/verify-token", [], asyncHandler(FirebaseAuthController.verifyFirebaseToken));
router.post('/shop', jwtAuth, asyncHandler(BarberController.createShopForBarber));

// Routes với middleware bảo vệ
router.get("/me", firebaseAuthMiddleware, asyncHandler(BarberController.getAuthenticatedUser));

router.get("/appoinments", jwtAuth, asyncHandler(BarberController.getShopAppointments));
router.get("/apointments/:id/status", jwtAuth, asyncHandler(BarberController.updateAppointmentStatusByBarber));
router.get("apointments/daily", jwtAuth, asyncHandler(BarberController.getDailyAppointments));
router.get('/shop/services', jwtAuth, asyncHandler(BarberController.getShopServices));
router.post('/shop/services', jwtAuth, asyncHandler(BarberController.addShopServices));
router.delete('/shop/services/:serviceId', jwtAuth, asyncHandler(BarberController.removeShopServices));

export { router as barberRouter };
