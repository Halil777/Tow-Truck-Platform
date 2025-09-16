import { Router } from "express";
import { SettingsController } from "../controllers/settingsController";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, requireRole(["SUPER_ADMIN"]), SettingsController.list);
router.patch("/", requireAuth, requireRole(["SUPER_ADMIN"]), SettingsController.upsert);

export default router;

