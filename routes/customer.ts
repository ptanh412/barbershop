// 9. Cập nhật routes
import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { CustomerController } from './controller/customer';
import { FirebaseAuthController } from './controller/firebaseAuth';
import { firebaseAuthMiddleware } from '../middleware/firebaseAuth';
import { jwtAuth } from '../middleware/jwtAuth';

const router = Router();

// Routes hiện có
router.post("/signup", [], asyncHandler(CustomerController.newCust));
// router.get("/", [], asyncHandler(CustomerController.test));

// Routes mới cho Firebase Auth
router.post("/firebase/verify-token", [], asyncHandler(FirebaseAuthController.verifyFirebaseToken));

// Routes với middleware bảo vệ
router.get("/me", firebaseAuthMiddleware, asyncHandler(CustomerController.getAuthenticatedUser));

router.get('/barber-shops' , jwtAuth, asyncHandler(CustomerController.getAllBarberShops));
router.get('/barber-shops/:id', jwtAuth, asyncHandler(CustomerController.getBarberShopById));
router.get('/barber-shops/:id/services', jwtAuth, asyncHandler(CustomerController.getBarberShopServices));


export { router as customerRouter };
