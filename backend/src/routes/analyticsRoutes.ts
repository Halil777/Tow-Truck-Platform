import { Router } from "express";
import { AnalyticsController } from "../controllers/analyticsController";

const router = Router();

router.get("/summary", AnalyticsController.summary);
router.get("/revenue", AnalyticsController.revenueTrends);
router.get("/driver-activity", AnalyticsController.driverActivity);

export default router;
