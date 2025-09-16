import { Router } from "express";
import { NotificationsController } from "../controllers/notificationsController";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.post("/broadcast", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), NotificationsController.broadcast);

export default router;

