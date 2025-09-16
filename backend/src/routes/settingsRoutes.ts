import { Router } from "express";
import { SettingsController } from "../controllers/settingsController";

const router = Router();

router.get("/", SettingsController.list);
router.patch("/", SettingsController.upsert);

export default router;

