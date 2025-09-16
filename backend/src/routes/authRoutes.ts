import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
