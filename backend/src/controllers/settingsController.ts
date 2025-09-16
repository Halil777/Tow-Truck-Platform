import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Setting } from "../entities/Setting";

export class SettingsController {
  static async list(req: Request, res: Response) {
    const settings = await AppDataSource.getRepository(Setting).find();
    res.json(settings);
  }

  static async upsert(req: Request, res: Response) {
    const { key, value } = req.body || {};
    if (!key) return res.status(400).json({ message: "key required" });
    const repo = AppDataSource.getRepository(Setting);
    let existing = await repo.findOne({ where: { key } });
    if (existing) {
      existing.value = value;
      await repo.save(existing);
      return res.json(existing);
    }
    const setting = repo.create({ key, value });
    await repo.save(setting);
    res.status(201).json(setting);
  }
}

