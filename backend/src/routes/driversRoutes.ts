import { Router } from "express";
import { DriversController } from "../controllers/driversController";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), DriversController.list);
router.post("/", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), DriversController.create);
router.patch("/:id", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), DriversController.update);
router.delete("/:id", requireAuth, requireRole(["SUPER_ADMIN"]), DriversController.remove);
router.post("/:id/approve", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), DriversController.approve);
router.post("/:id/reject", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), DriversController.reject);

export default router;

