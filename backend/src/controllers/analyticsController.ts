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

  static async revenueTrends(req: Request, res: Response) {
    const paymentRepo = AppDataSource.getRepository(Payment);
    const { start, end, days } = req.query;

    const parseDate = (input: unknown): Date | null => {
      if (input == null || input === "") return null;
      const date = new Date(String(input));
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const parsedEnd = parseDate(end);
    if (end && !parsedEnd) {
      return res.status(400).json({ message: "Invalid end date" });
    }
    let endDate = parsedEnd ?? new Date();

    const parsedStart = parseDate(start);
    if (start && !parsedStart) {
      return res.status(400).json({ message: "Invalid start date" });
    }
    let startDate = parsedStart;

    if (!startDate) {
      const requestedDays = Number(days);
      const window = Number.isFinite(requestedDays) && requestedDays > 0 ? Math.min(Math.floor(requestedDays), 180) : 30;
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - (window - 1));
    }

    if (startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const rows = await paymentRepo
      .createQueryBuilder("p")
      .select("date_trunc('day', p.createdAt)", "day")
      .addSelect("COALESCE(SUM(p.amount), 0)", "total")
      .where("p.status = :status", { status: "SUCCESS" })
      .andWhere("p.createdAt BETWEEN :start AND :end", { start: startDate.toISOString(), end: endDate.toISOString() })
      .groupBy("day")
      .orderBy("day", "ASC")
      .getRawMany();

    const totals = new Map<string, number>();
    for (const row of rows) {
      const rawDate = row.day instanceof Date ? row.day : new Date(row.day);
      if (!Number.isNaN(rawDate.getTime())) {
        const key = rawDate.toISOString().slice(0, 10);
        totals.set(key, Number(row.total) || 0);
      }
    }

    const points: { date: string; total: number }[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const key = cursor.toISOString().slice(0, 10);
      points.push({ date: key, total: totals.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    const totalRevenue = points.reduce((acc, item) => acc + item.total, 0);
    const average = points.length ? totalRevenue / points.length : 0;

    return res.json({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      days: points.length,
      total: totalRevenue,
      average,
      currency: "RUB",
      points,
    });
  }

  static async driverActivity(req: Request, res: Response) {
    const orderRepo = AppDataSource.getRepository(Order);
    const { start, end, days, limit } = req.query;

    const parseDate = (input: unknown): Date | null => {
      if (input == null || input === "") return null;
      const date = new Date(String(input));
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const parsedEnd = parseDate(end);
    if (end && !parsedEnd) {
      return res.status(400).json({ message: "Invalid end date" });
    }
    let endDate = parsedEnd ?? new Date();

    const parsedStart = parseDate(start);
    if (start && !parsedStart) {
      return res.status(400).json({ message: "Invalid start date" });
    }
    let startDate = parsedStart;

    if (!startDate) {
      const requestedDays = Number(days);
      const window = Number.isFinite(requestedDays) && requestedDays > 0 ? Math.min(Math.floor(requestedDays), 180) : 30;
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - (window - 1));
    }

    if (startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const qb = orderRepo
      .createQueryBuilder("o")
      .innerJoin("o.driver", "d")
      .leftJoin("o.payment", "p")
      .select("d.id", "driverId")
      .addSelect("d.name", "name")
      .addSelect("d.phone", "phone")
      .addSelect("d.status", "status")
      .addSelect("d.online", "online")
      .addSelect("d.rating", "rating")
      .addSelect("SUM(CASE WHEN o.status = 'COMPLETED' THEN 1 ELSE 0 END)", "completed")
      .addSelect("SUM(CASE WHEN o.status = 'IN_PROGRESS' THEN 1 ELSE 0 END)", "inProgress")
      .addSelect("SUM(CASE WHEN o.status = 'ASSIGNED' THEN 1 ELSE 0 END)", "assigned")
      .addSelect("SUM(CASE WHEN o.status = 'CANCELLED' THEN 1 ELSE 0 END)", "cancelled")
      .addSelect("SUM(CASE WHEN p.status = 'SUCCESS' THEN p.amount ELSE 0 END)", "revenue")
      .where('o.driver IS NOT NULL')
      .andWhere('o.createdAt BETWEEN :start AND :end', { start: startDate.toISOString(), end: endDate.toISOString() })
      .groupBy('d.id')
      .orderBy('completed', 'DESC')
      .addOrderBy('revenue', 'DESC');

    const limitNumber = Number(limit);
    if (Number.isFinite(limitNumber) && limitNumber > 0) {
      qb.limit(Math.min(200, Math.floor(limitNumber)));
    }

    const rows = await qb.getRawMany();

    const toBoolean = (value: unknown) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value !== 0;
      if (typeof value === 'string') return value === 'true' || value === '1';
      return false;
    };

    const items = rows.map((row: any) => ({
      driverId: Number(row.driverId),
      name: row.name ?? '',
      phone: row.phone ?? '',
      status: row.status ?? '',
      online: toBoolean(row.online),
      rating: row.rating != null ? Number(row.rating) : null,
      completed: Number(row.completed) || 0,
      inProgress: Number(row.inProgress) || 0,
      assigned: Number(row.assigned) || 0,
      cancelled: Number(row.cancelled) || 0,
      revenue: Number(row.revenue) || 0,
    }));

    const totalDrivers = items.length;
    const onlineDrivers = items.reduce((acc, item) => acc + (item.online ? 1 : 0), 0);
    const totalCompleted = items.reduce((acc, item) => acc + item.completed, 0);
    const totalRevenue = items.reduce((acc, item) => acc + item.revenue, 0);
    const dayCount = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);

    return res.json({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      days: dayCount,
      totalDrivers,
      onlineDrivers,
      totalCompleted,
      totalRevenue,
      currency: 'RUB',
      items,
    });
  }
}
