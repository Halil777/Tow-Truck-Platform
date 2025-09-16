import { Router } from "express";
import { NotificationsController } from "../controllers/notificationsController";

const router = Router();

router.post("/broadcast", NotificationsController.broadcast);

export default router;

