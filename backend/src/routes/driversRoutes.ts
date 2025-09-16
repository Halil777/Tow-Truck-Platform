import { Router } from "express";
import { DriversController } from "../controllers/driversController";

const router = Router();

router.get("/", DriversController.list);
router.get("/by-phone/:phone", DriversController.getByPhone);
router.post("/", DriversController.create);
router.patch("/:id", DriversController.update);
router.delete("/:id", DriversController.remove);
router.post("/:id/approve", DriversController.approve);
router.post("/:id/reject", DriversController.reject);

export default router;

