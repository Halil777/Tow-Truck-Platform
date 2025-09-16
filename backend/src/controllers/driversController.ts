import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Driver } from "../entities/Driver";

export class DriversController {
  static async list(req: Request, res: Response) {
    const repo = AppDataSource.getRepository(Driver);
    const drivers = await repo.find();
    res.json(drivers);
  }

  static async create(req: Request, res: Response) {
    const repo = AppDataSource.getRepository(Driver);
    const driver = repo.create(req.body);
    await repo.save(driver);
    res.status(201).json(driver);
  }

  static async update(req: Request, res: Response) {
    const repo = AppDataSource.getRepository(Driver);
    const id = Number(req.params.id);
    await repo.update({ id }, req.body);
    const updated = await repo.findOne({ where: { id } });
    res.json(updated);
  }

  static async remove(req: Request, res: Response) {
    const repo = AppDataSource.getRepository(Driver);
    const id = Number(req.params.id);
    await repo.delete(id);
    res.status(204).send();
  }

  static async approve(req: Request, res: Response) {
    const repo = AppDataSource.getRepository(Driver);
    const id = Number(req.params.id);
    await repo.update({ id }, { status: "APPROVED" });
    res.json({ message: "approved" });
  }

  static async reject(req: Request, res: Response) {
    const repo = AppDataSource.getRepository(Driver);
    const id = Number(req.params.id);
    await repo.update({ id }, { status: "REJECTED" });
    res.json({ message: "rejected" });
  }
}

