import { Request, Response } from "express";
import { BotService } from "../services/botService";

export class BotController {
  private botService: BotService;

  constructor(botService: BotService) {
    this.botService = botService;
  }

  public getBotInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const bot = this.botService.getBotInstance();
      // Bot info almak üçin mehanizm
      res.json({
        status: "success",
        message: "Bot is running",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Bot info alynmady",
      });
    }
  };
}
