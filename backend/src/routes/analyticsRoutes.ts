import { Router } from "express";
import { AnalyticsController } from "../controllers/analyticsController";

const router = Router();

router.get("/summary", AnalyticsController.summary);

export default router;

