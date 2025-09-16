import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { User } from "../entities/User";

export class UsersController {
  static async list(req: Request, res: Response) {
    const users = await AppDataSource.getRepository(User).find();
    res.json(users);
  }

  static async suspend(req: Request, res: Response) {
    const id = Number(req.params.id);
    await AppDataSource.getRepository(User).update({ id }, { suspended: true });
    res.json({ message: "suspended" });
  }

  static async unsuspend(req: Request, res: Response) {
    const id = Number(req.params.id);
    await AppDataSource.getRepository(User).update({ id }, { suspended: false });
    res.json({ message: "unsuspended" });
  }
}

