import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Payment } from "../entities/Payment";

export class PaymentsController {
  static async list(req: Request, res: Response) {
    const repo = AppDataSource.getRepository(Payment);
    const payments = await repo.find({ order: { createdAt: "DESC" } });
    res.json(payments);
  }

  static async exportCsv(req: Request, res: Response) {
    const repo = AppDataSource.getRepository(Payment);
    const payments = await repo.find({ order: { createdAt: "DESC" } });
    const header = ["id", "amount", "status", "provider", "reference", "createdAt"];
    const rows = payments.map((p) => [p.id, p.amount, p.status, p.provider || "", p.reference || "", p.createdAt.toISOString()]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=payments.csv");
    res.send(csv);
  }
}

