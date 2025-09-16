import { Router } from "express";
import { OrdersController } from "../controllers/ordersController";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), OrdersController.list);
router.get("/:id", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), OrdersController.getById);
router.patch("/:id", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), OrdersController.updateStatus);

export default router;

