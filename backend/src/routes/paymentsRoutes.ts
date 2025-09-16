import { Router } from "express";
import { PaymentsController } from "../controllers/paymentsController";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), PaymentsController.list);
router.get("/export", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), PaymentsController.exportCsv);

export default router;

