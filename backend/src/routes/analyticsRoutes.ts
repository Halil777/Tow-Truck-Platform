import { Router } from "express";
import { AnalyticsController } from "../controllers/analyticsController";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get(
  "/summary",
  requireAuth,
  requireRole(["SUPER_ADMIN", "MANAGER"]),
  AnalyticsController.summary
);

export default router;

