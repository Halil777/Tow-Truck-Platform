import { Router } from "express";
import { ReviewsController } from "../controllers/reviewsController";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), ReviewsController.list);
router.post("/:id/moderate", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), ReviewsController.moderate);

export default router;

