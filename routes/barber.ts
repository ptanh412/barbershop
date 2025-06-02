import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { BarberController } from "./controller/barber";
import { FirebaseAuthController } from "./controller/firebaseAuth";
import { firebaseAuthMiddleware } from "../middleware/firebaseAuth";
import { jwtAuth } from "../middleware/jwtAuth";

const router = Router();

router.post("/signup", [], asyncHandler(BarberController.newBarber));
router.post("/login", [], asyncHandler(BarberController.login));
router.get("/", [], asyncHandler(BarberController.test));
// Routes mới cho Firebase Auth
router.post("/firebase/verify-token", [], asyncHandler(FirebaseAuthController.verifyFirebaseToken));
router.post('/shop', jwtAuth, asyncHandler(BarberController.createShopForBarber));
router.get('/service-templates', asyncHandler(BarberController.getServiceTemplates));

// Routes với middleware bảo vệ
router.get("/me", firebaseAuthMiddleware, asyncHandler(BarberController.getAuthenticatedUser));

router.get("/appointments", jwtAuth, asyncHandler(BarberController.getShopAppointments));
router.patch("/appointments/:id/status", jwtAuth, asyncHandler(BarberController.updateAppointmentStatusByBarber));
router.get("/appointments/daily", jwtAuth, asyncHandler(BarberController.getDailyAppointments));
router.get("/appointments/stats", jwtAuth, asyncHandler(BarberController.getBarberBookingStats));
router.get('/shop/services', jwtAuth, asyncHandler(BarberController.getShopServices));
router.post('/shop/services', jwtAuth, asyncHandler(BarberController.addShopServices));
router.delete('/shop/services/:serviceId', jwtAuth, asyncHandler(BarberController.removeShopServices));

export { router as barberRouter };
