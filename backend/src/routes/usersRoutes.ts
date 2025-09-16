import { Router } from "express";
import { UsersController } from "../controllers/usersController";

const router = Router();

router.get("/", UsersController.list);
router.post("/:id/suspend", UsersController.suspend);
router.post("/:id/unsuspend", UsersController.unsuspend);

export default router;

