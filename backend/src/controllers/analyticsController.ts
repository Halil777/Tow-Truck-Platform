import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Order } from "../entities/Order";
import { Driver } from "../entities/Driver";
import { User } from "../entities/User";
import { Payment } from "../entities/Payment";

export class AnalyticsController {
  static async summary(req: Request, res: Response) {
    const orderRepo = AppDataSource.getRepository(Order);
    const driverRepo = AppDataSource.getRepository(Driver);
    const userRepo = AppDataSource.getRepository(User);
    const paymentRepo = AppDataSource.getRepository(Payment);

    const [activeOrders, completedOrders, totalDrivers, onlineDrivers, registeredUsers] = await Promise.all([
      orderRepo.count({ where: { status: "IN_PROGRESS" } }),
      orderRepo.count({ where: { status: "COMPLETED" } }),
      driverRepo.count(),
      driverRepo.count({ where: { online: true } }),
      userRepo.count(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyRevenue = await paymentRepo
      .createQueryBuilder("p")
      .select("COALESCE(SUM(p.amount),0)", "sum")
      .where("p.status = :status", { status: "SUCCESS" })
      .andWhere("p.createdAt >= :start", { start: today.toISOString() })
      .getRawOne();

    return res.json({
      activeOrders,
      completedOrders,
      totalDrivers,
      onlineDrivers,
      registeredUsers,
      dailyRevenue: Number(dailyRevenue?.sum || 0),
    });
  }
}

