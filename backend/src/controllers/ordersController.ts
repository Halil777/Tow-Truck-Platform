import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Order } from "../entities/Order";
import { Driver } from "../entities/Driver";
import { getIO } from "../utils/socket";
import { Payment } from "../entities/Payment";
import { User } from "../entities/User";

export class OrdersController {
  static async list(req: Request, res: Response) {
    const repo = AppDataSource.getRepository(Order);
    const { status, driverId } = req.query as any;
    const where: any = {};
    if (status) where.status = status;
    if (driverId) where.driver = { id: Number(driverId) };
    const orders = await repo.find({ where, order: { createdAt: "DESC" }, relations: ["payment"] });
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
      const io = getIO();
      io.emit("order.updated", { id: order.id, status: order.status, driverId: order.driver?.id || null });
      if (order.driver?.id) {
        io.to(`driver:${order.driver.id}`).emit("order.assigned", order);
      }
    } catch {}
    res.json(order);
  }

  static async accept(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { driverId } = req.body || {};
    if (!driverId) return res.status(400).json({ message: "driverId required" });
    const repo = AppDataSource.getRepository(Order);
    const driverRepo = AppDataSource.getRepository(Driver);
    const driver = await driverRepo.findOne({ where: { id: driverId } });
    if (!driver) return res.status(400).json({ message: "Driver not found" });
    const order = await repo.findOne({ where: { id } });
    if (!order) return res.status(404).json({ message: "Not found" });
    order.driver = driver;
    order.status = "IN_PROGRESS";
    await repo.save(order);
    try {
      const io = getIO();
      io.emit("order.updated", { id: order.id, status: order.status, driverId: driver.id });
      io.to(`driver:${driver.id}`).emit("order.accepted", order);
    } catch {}
    res.json(order);
  }

  static async reject(req: Request, res: Response) {
    const id = Number(req.params.id);
    const repo = AppDataSource.getRepository(Order);
    const order = await repo.findOne({ where: { id } });
    if (!order) return res.status(404).json({ message: "Not found" });
    order.status = "REJECTED" as any;
    order.driver = null as any;
    await repo.save(order);
    try {
      getIO().emit("order.updated", { id: order.id, status: order.status, driverId: null });
    } catch {}
    res.json(order);
  }

  static async complete(req: Request, res: Response) {
    const id = Number(req.params.id);
    const repo = AppDataSource.getRepository(Order);
    const payRepo = AppDataSource.getRepository(Payment);
    const order = await repo.findOne({ where: { id } });
    if (!order) return res.status(404).json({ message: "Not found" });
    const distKm = computeDistance(order.pickupLocation, order.dropoffLocation);
    order.distanceKm = distKm;
    order.price = round2(distKm * 10);
    order.status = "AWAITING_PAYMENT" as any;
    await repo.save(order);
    let payment = await payRepo.findOne({ where: { order: { id: order.id } as any } });
    if (!payment) payment = payRepo.create({ order, amount: order.price, status: "PENDING" });
    else {
      payment.amount = order.price;
      payment.status = "PENDING";
    }
    await payRepo.save(payment);
    try {
      const io = getIO();
      io.emit("order.updated", { id: order.id, status: order.status, driverId: order.driver?.id || null });
      if (order.driver?.id) io.to(`driver:${order.driver.id}`).emit("order.awaiting_payment", order);
    } catch {}
    try {
      const user = await AppDataSource.getRepository(User).findOne({ where: { id: order.user.id } });
      const chatId = (user as any)?.telegramId;
      if (chatId) {
        const { Telegraf } = require('telegraf');
        const bot = new Telegraf(process.env.BOT_TOKEN || '');
        // Do not launch a new long-polling; just send via HTTP API
        await bot.telegram.sendMessage(
          chatId,
          `Сумма к оплате: ${order.price.toFixed(2)}₽. Выберите способ оплаты:`,
          { reply_markup: { inline_keyboard: [[{ text: 'Наличные', callback_data: `pay:${order.id}:CASH` }, { text: 'Карта', callback_data: `pay:${order.id}:CARD` }]] } }
        );
        try { await bot.stop(() => {}); } catch {}
      }
    } catch {}
    res.json({ order, payment });
  }

  static async pay(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { method } = req.body || {};
    if (!method) return res.status(400).json({ message: "method required" });
    const repo = AppDataSource.getRepository(Order);
    const payRepo = AppDataSource.getRepository(Payment);
    const order = await repo.findOne({ where: { id } });
    if (!order) return res.status(404).json({ message: "Not found" });
    let payment = await payRepo.findOne({ where: { order: { id: order.id } as any } });
    if (!payment) payment = payRepo.create({ order, amount: order.price, status: "PENDING" });
    payment.provider = String(method);
    payment.status = "SUCCESS";
    await payRepo.save(payment);
    order.status = "COMPLETED" as any;
    order.completedAt = new Date();
    await repo.save(order);
    try {
      const io = getIO();
      io.emit("order.updated", { id: order.id, status: order.status, driverId: order.driver?.id || null });
      if (order.driver?.id) io.to(`driver:${order.driver.id}`).emit("order.completed", order);
    } catch {}
    res.json({ order, payment });
  }
}

function toRad(n: number) { return (n * Math.PI) / 180; }
function haversine(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function computeDistance(pick: any, drop: any): number {
  const a = normalizeCoord(pick);
  const b = normalizeCoord(drop);
  if (!a || !b) return 0;
  return Math.max(0, haversine(a, b));
}
function normalizeCoord(loc: any): { latitude: number; longitude: number } | null {
  if (!loc) return null;
  const lat = loc?.latitude ?? loc?.lat;
  const lon = loc?.longitude ?? loc?.lng;
  if (typeof lat === 'number' && typeof lon === 'number') return { latitude: lat, longitude: lon };
  return null;
}
function round2(n: number) { return Math.round(n * 100) / 100; }

