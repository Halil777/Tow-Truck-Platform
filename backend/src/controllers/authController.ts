import { Request, Response } from "express";
import { AdminService } from "../services/adminService";

const adminService = new AdminService();

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ message: "email and password required" });
      const result = await adminService.login(email, password);
      return res.json(result);
    } catch (e: any) {
      return res.status(401).json({ message: e?.message || "Login failed" });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body || {};
      if (!refreshToken) return res.status(400).json({ message: "refreshToken required" });
      const result = await adminService.refresh(refreshToken);
      return res.json(result);
    } catch (e: any) {
      return res.status(401).json({ message: e?.message || "Refresh failed" });
    }
  }
}

