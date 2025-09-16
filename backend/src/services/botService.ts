import { Telegraf, Context, Markup } from "telegraf";
import { Scenes, session } from "telegraf";
import { UserService } from "./userService";
import { AppDataSource } from "../config/database";
import { Order } from "../entities/Order";
import { User } from "../entities/User";

export class BotService {
  private bot: Telegraf;
  private userService: UserService;
  private stage: any;
  private signalsBound = false;

  constructor(token: string) {
    this.bot = new Telegraf(token as string);
    this.userService = new UserService();
    this.stage = new Scenes.Stage<any>([this.createRegisterWizard(), this.createOrderWizard()]) as any;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.bot.use(session() as any);
    this.bot.use(this.stage.middleware() as any);

    this.bot.start(async (ctx: Context) => {
      await this.handleStart(ctx);
    });

    this.bot.help((ctx: Context) => {
      ctx.reply(
        "Commands:\n/start - Start bot\n/help - Help\n/register - Share phone to register\n/order - Create tow order\n(You can also send a location to notify admin)"
      );
    });

    this.bot.command("users", async (ctx: Context) => {
      await this.handleUsersCommand(ctx);
    });

    this.bot.command("register", async (ctx: any) => {
      await ctx.scene.enter("register-wizard");
    });

    this.bot.command("order", async (ctx: any) => {
      await ctx.scene.enter("order-wizard");
    });

    // Location forwarding to admin (outside of wizards)
    this.bot.on("location", async (ctx: any) => {
      const adminChatId = process.env.ADMIN_CHAT_ID;
      if (!adminChatId) return;
      const from = ctx.message?.from;
      const loc = ctx.message?.location;
      try {
        await this.bot.telegram.sendMessage(
          adminChatId,
          `User sent location:\n- Name: ${from?.first_name || ""} ${from?.last_name || ""}\n- Username: @${from?.username || "-"}\n- Telegram ID: ${from?.id}`
        );
        await this.bot.telegram.sendLocation(adminChatId, loc.latitude, loc.longitude);
        await ctx.reply("Location shared with admin. Thank you.");
      } catch (e) {
        console.error("Forward location error", e);
      }
    });
  }

  private async handleStart(ctx: Context): Promise<void> {
    try {
      const from: any = (ctx as any).message?.from || (ctx as any).from;
      if (!from) return;
      const user = await this.userService.findOrCreateUser(from);
      await ctx.reply(
        `Welcome ${user.firstName}! Type /register to share your phone or /order to request a tow.`
      );
    } catch (error) {
      console.error("Start handler error:", error);
      await ctx.reply("An error occurred. Please try again.");
    }
  }

  private async handleUsersCommand(ctx: Context): Promise<void> {
    try {
      const users = await this.userService.getAllUsers();
      const userCount = users.length;
      await ctx.reply(`Total users: ${userCount}`);
    } catch (error) {
      console.error("Users command error:", error);
      await ctx.reply("Failed to fetch users.");
    }
  }

  public async launch(): Promise<void> {
    if (String(process.env.BOT_ENABLED || 'true').toLowerCase() === 'false' || process.env.BOT_ENABLED === '0') {
      console.log('Telegram bot disabled by BOT_ENABLED env.');
      return;
    }
    // Bind shutdown signals once
    if (!this.signalsBound) {
      process.once("SIGINT", () => this.bot.stop("SIGINT"));
      process.once("SIGTERM", () => this.bot.stop("SIGTERM"));
      this.signalsBound = true;
    }

    const retryMs = Number(process.env.BOT_RETRY_MS || 30000);

    try {
      await this.bot.launch();
      console.log("Telegram bot started!");
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error(`Failed to start Telegram bot: ${msg}`);
      console.log(`Will retry starting bot in ${Math.floor(retryMs / 1000)}s...`);
      setTimeout(() => {
        // Fire and forget; errors handled inside launch
        this.launch().catch(() => {});
      }, retryMs);
    }
  }

  public getBotInstance(): Telegraf {
    return this.bot;
  }

  private createRegisterWizard(): Scenes.WizardScene<Scenes.WizardContext> {
    const askPhone = async (ctx: any) => {
      await ctx.reply(
        "Please share your phone number",
        Markup.keyboard([Markup.button.contactRequest("Share phone")]).oneTime().resize()
      );
      return ctx.wizard.next();
    };

    const savePhone = async (ctx: any) => {
      try {
        const contact = ctx.message?.contact;
        let phone: string | undefined;
        if (contact) {
          phone = contact.phone_number;
        } else if (ctx.message?.text) {
          phone = String(ctx.message.text);
        }
        if (!phone) {
          await ctx.reply("Please send a phone number or tap the button.");
          return;
        }
        const userRepo = AppDataSource.getRepository(User);
        await userRepo.update({ telegramId: String(ctx.from.id) as any }, { phone });
        await ctx.reply("Registration complete. Thanks!", Markup.removeKeyboard());
        return ctx.scene.leave();
      } catch (e) {
        console.error("Register save error", e);
        await ctx.reply("Could not save phone. Try again later.");
        return ctx.scene.leave();
      }
    };

    return new Scenes.WizardScene("register-wizard", askPhone as any, savePhone as any);
  }

  private createOrderWizard(): Scenes.WizardScene<Scenes.WizardContext> {
    const askPickup = async (ctx: any) => {
      await ctx.reply("Send pickup location (share location or type address).");
      return ctx.wizard.next();
    };

    const capturePickup = async (ctx: any) => {
      const state: any = (ctx.wizard.state ||= {});
      if (ctx.message?.location) {
        const { latitude, longitude } = ctx.message.location;
        state.pickup = { latitude, longitude };
      } else if (ctx.message?.text) {
        state.pickup = { address: ctx.message.text };
      } else {
        await ctx.reply("Please send a location or type an address.");
        return;
      }
      await ctx.reply("Now send dropoff location (or type address).");
      return ctx.wizard.next();
    };

    const captureDropoff = async (ctx: any) => {
      const state: any = ctx.wizard.state;
      if (ctx.message?.location) {
        const { latitude, longitude } = ctx.message.location;
        state.dropoff = { latitude, longitude };
      } else if (ctx.message?.text) {
        state.dropoff = { address: ctx.message.text };
      } else {
        await ctx.reply("Please send a location or type an address.");
        return;
      }
      await ctx.reply("Creating your order...");

      try {
        const userRepo = AppDataSource.getRepository(User);
        let user = await userRepo.findOne({ where: { telegramId: String(ctx.from.id) } });
        if (!user) {
          user = await this.userService.findOrCreateUser(ctx.from);
        }

        const orderRepo = AppDataSource.getRepository(Order);
        const order = orderRepo.create({
          user,
          status: "PENDING",
          pickupLocation: state.pickup,
          dropoffLocation: state.dropoff,
          price: 0,
        });
        await orderRepo.save(order);

        const adminChatId = process.env.ADMIN_CHAT_ID;
        if (adminChatId) {
          const mapsLinkPickup = state.pickup?.latitude
            ? `https://maps.google.com/?q=${state.pickup.latitude},${state.pickup.longitude}`
            : state.pickup?.address || "";
          const mapsLinkDrop = state.dropoff?.latitude
            ? `https://maps.google.com/?q=${state.dropoff.latitude},${state.dropoff.longitude}`
            : state.dropoff?.address || "";
          await this.bot.telegram.sendMessage(
            adminChatId,
            `New order #${order.id} from ${ctx.from.first_name || "User"} (@${ctx.from.username || "-"})\nPickup: ${mapsLinkPickup}\nDropoff: ${mapsLinkDrop}`
          );
          if (state.pickup?.latitude) {
            await this.bot.telegram.sendLocation(adminChatId, state.pickup.latitude, state.pickup.longitude);
          }
          if (state.dropoff?.latitude) {
            await this.bot.telegram.sendLocation(adminChatId, state.dropoff.latitude, state.dropoff.longitude);
          }
        }

        await ctx.reply(`Order created. ID: ${order.id}. We will assign a driver soon.`);
      } catch (e) {
        console.error("Order creation error", e);
        await ctx.reply("Could not create order. Please try again later.");
      }

      return ctx.scene.leave();
    };

    return new Scenes.WizardScene("order-wizard", askPickup as any, capturePickup as any, captureDropoff as any);
  }
}
