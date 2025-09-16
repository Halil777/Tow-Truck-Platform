import { Router } from "express";
import { ReviewsController } from "../controllers/reviewsController";

const router = Router();

router.get("/", ReviewsController.list);
router.post("/:id/moderate", ReviewsController.moderate);

export default router;

