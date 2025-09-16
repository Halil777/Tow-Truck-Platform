import { Router } from "express";
import { BotController } from "../controllers/botController";
import { BotService } from "../services/botService";

export const createBotRoutes = (botService: BotService): Router => {
  const router = Router();
  const botController = new BotController(botService);

  router.get("/bot-info", botController.getBotInfo);

  return router;
};
