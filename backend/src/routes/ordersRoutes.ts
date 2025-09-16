import { Router } from "express";
import { OrdersController } from "../controllers/ordersController";

const router = Router();

router.get("/", OrdersController.list);
router.get("/:id", OrdersController.getById);
router.patch("/:id", OrdersController.updateStatus);
router.post("/:id/accept", OrdersController.accept);
router.post("/:id/reject", OrdersController.reject);
router.post("/:id/complete", OrdersController.complete);
router.post("/:id/pay", OrdersController.pay);

export default router;

