import "reflect-metadata";
import express from "express";
import { config } from "dotenv";
import { initializeDatabase } from "./config/database";
import { BotService } from "./services/botService";
import { createBotRoutes } from "./routes/botRoutes";
import { Logger } from "./utils/logger";
import authRoutes from "./routes/authRoutes";
import usersRoutes from "./routes/usersRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import { AdminService } from "./services/adminService";
import analyticsRoutes from "./routes/analyticsRoutes";
import ordersRoutes from "./routes/ordersRoutes";
import driversRoutes from "./routes/driversRoutes";
import paymentsRoutes from "./routes/paymentsRoutes";
import reviewsRoutes from "./routes/reviewsRoutes";
import notificationsRoutes from "./routes/notificationsRoutes";

// Environment variables
config();

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  Logger.error("BOT_TOKEN environment variable gerek!");
  process.exit(1);
}

async function bootstrap(): Promise<void> {
  try {
    // Database initialize
    await initializeDatabase();

    // Express app
    const app = express();

    // Bot service
    const botService = new BotService(BOT_TOKEN as string);
    botService.launch();

    // Routes
    app.use(express.json());
    // Ensure SUPER_ADMIN from env exists and is active
    const adminService = new AdminService();
    await adminService.ensureAdminFromEnv();

    // API routes
    app.use("/api", createBotRoutes(botService));
    app.use("/api/auth", authRoutes);
    app.use("/api/users", usersRoutes);
    app.use("/api/settings", settingsRoutes);
    app.use("/api/analytics", analyticsRoutes);
    app.use("/api/orders", ordersRoutes);
    app.use("/api/drivers", driversRoutes);
    app.use("/api/payments", paymentsRoutes);
    app.use("/api/reviews", reviewsRoutes);
    app.use("/api/notifications", notificationsRoutes);

    app.get("/", (req, res) => {
      res.json({
        message: "Telegram Bot Server Isleyar!",
        status: "success",
        timestamp: new Date().toISOString(),
      });
    });

    // Server start
    app.listen(PORT, () => {
      Logger.info(`Server http://localhost:${PORT} portunda işleýär`);
    });
  } catch (error) {
    Logger.error("Application bootstrap error:", error);
    process.exit(1);
  }
}

bootstrap();
