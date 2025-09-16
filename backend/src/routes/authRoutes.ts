import { Router } from "express";
import { AuthController } from "../controllers/authController";
// Auth disabled temporarily

const router = Router();

router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/reset-super-admin", AuthController.resetSuperAdmin);
router.get("/me", (req, res) => {
  res.json({ user: { sub: "0", role: "SUPER_ADMIN", email: "demo@example.com" } });
});

export default router;
