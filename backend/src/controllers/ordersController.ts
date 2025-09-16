import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Order } from "../entities/Order";
import { Driver } from "../entities/Driver";
import { getIO } from "../utils/socket";

export class OrdersController {
  static async list(req: Request, res: Response) {
    const repo = AppDataSource.getRepository(Order);
    const { status, driverId } = req.query as any;
    const where: any = {};
    if (status) where.status = status;
    if (driverId) where.driver = { id: Number(driverId) };
    const orders = await repo.find({ where, order: { createdAt: "DESC" } });
    res.json(orders);
  }

  static async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const order = await AppDataSource.getRepository(Order).findOne({ where: { id } });
    if (!order) return res.status(404).json({ message: "Not found" });
    res.json(order);
  }

  static async updateStatus(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { status, driverId } = req.body || {};
    const repo = AppDataSource.getRepository(Order);
    const order = await repo.findOne({ where: { id } });
    if (!order) return res.status(404).json({ message: "Not found" });
    if (driverId) {
      const driver = await AppDataSource.getRepository(Driver).findOne({ where: { id: driverId } });
      if (!driver) return res.status(400).json({ message: "Driver not found" });
      order.driver = driver;
    }
    if (status) order.status = status;
    await repo.save(order);
    try {
      getIO().emit("order.updated", { id: order.id, status: order.status, driverId: order.driver?.id || null });
    } catch {}
    res.json(order);
  }
}

