import { Router } from "express";
import { PaymentsController } from "../controllers/paymentsController";

const router = Router();

router.get("/", PaymentsController.list);
router.get("/export", PaymentsController.exportCsv);

export default router;

