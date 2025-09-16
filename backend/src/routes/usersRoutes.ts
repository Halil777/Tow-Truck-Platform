import { Router } from "express";
import { UsersController } from "../controllers/usersController";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), UsersController.list);
router.post("/:id/suspend", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), UsersController.suspend);
router.post("/:id/unsuspend", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), UsersController.unsuspend);

export default router;

