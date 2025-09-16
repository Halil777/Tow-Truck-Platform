import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Review } from "../entities/Review";

export class ReviewsController {
  static async list(req: Request, res: Response) {
    const reviews = await AppDataSource.getRepository(Review).find({ order: { createdAt: "DESC" } });
    res.json(reviews);
  }

  static async moderate(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { action } = req.body || {};
    if (!action) return res.status(400).json({ message: "action required" });
    const repo = AppDataSource.getRepository(Review);
    switch (action) {
      case "approve":
        await repo.update({ id }, { approved: true });
        break;
      case "hide":
        await repo.update({ id }, { approved: false });
        break;
      case "delete":
        await repo.delete(id);
        break;
      default:
        return res.status(400).json({ message: "invalid action" });
    }
    res.json({ message: "ok" });
  }
}

