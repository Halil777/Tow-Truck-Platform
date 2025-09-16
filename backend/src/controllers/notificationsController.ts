import { Request, Response } from "express";
import { getIO } from "../utils/socket";

export class NotificationsController {
  static async broadcast(req: Request, res: Response) {
    const { audience, title, message } = req.body || {};
    if (!audience || !message) return res.status(400).json({ message: "audience and message required" });
    try {
      getIO().emit("notification", { audience, title, message, at: new Date().toISOString() });
    } catch {}
    // Integration with SMS/Email providers can be added here.
    res.json({ sent: true });
  }
}

