import { Telegraf, Context, Markup } from "telegraf";
import { Scenes, session } from "telegraf";
import { UserService } from "./userService";
import { AppDataSource } from "../config/database";
import { Order } from "../entities/Order";
import { User } from "../entities/User";
import { Driver } from "../entities/Driver";
import { Payment } from "../entities/Payment";
import { getIO } from "../utils/socket";
import { t, setUserLanguageByTelegramId, getLangName } from "../utils/i18n";

export class BotService {
  private bot: Telegraf;
  private userService: UserService;
  private stage: any;
  private signalsBound = false;

  constructor(token: string) {
    this.bot = new Telegraf(token as string);
    this.userService = new UserService();
    this.stage = new Scenes.Stage<any>([
      this.createRegisterWizard(),
      this.createOrderWizard(),
    ]) as any;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.bot.use(session() as any);
    this.bot.use(this.stage.middleware() as any);

    this.bot.start(async (ctx: Context) => {
      await this.handleStart(ctx);
    });

    this.bot.help(async (ctx: Context) => {
      ctx.reply(await t(ctx, "help.text"));
    });

    // Language command
    this.bot.command("language", async (ctx: any) => {
      await this.showLanguageMenu(ctx);
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

    // Main menu buttons (RU + UZ)
    const ORDER_TEXT_RU = "🚚 Заказать эвакуатор";
    const ORDER_TEXT_UZ = "🚚 Evakuator chaqirish";
    const REG_TEXT_RU = "📞 Оставить номер";
    const REG_TEXT_UZ = "📞 Telefon raqamini qoldirish";
    const LANG_TEXT_RU = "🌐 Язык";
    const LANG_TEXT_UZ = "🌐 Til";

    this.bot.hears([ORDER_TEXT_RU, ORDER_TEXT_UZ], async (ctx: any) => {
      await ctx.scene.enter("order-wizard");
    });
    this.bot.hears([REG_TEXT_RU, REG_TEXT_UZ], async (ctx: any) => {
      await ctx.scene.enter("register-wizard");
    });
    this.bot.hears([LANG_TEXT_RU, LANG_TEXT_UZ], async (ctx: any) => {
      await this.showLanguageMenu(ctx);
    });

    // Callback handler for language selection
    this.bot.on("callback_query", async (ctx: any, next: any) => {
      const data: string = ctx.callbackQuery?.data || "";
      if (data.startsWith("lang:")) {
        const lang = data.split(":")[1];
        if (lang === "ru" || lang === "uz") {
          await setUserLanguageByTelegramId(String(ctx.from.id), lang as any);
          await ctx.answerCbQuery();
          await ctx.reply(await t(ctx, "lang.set", { langName: getLangName(lang as any) }));
          await this.sendMainMenu(ctx);
        } else {
          await ctx.answerCbQuery();
        }
        return;
      }
      return next();
    });

    // Location forwarding to admin (outside of order wizard)
    this.bot.on("location", async (ctx: any, next: any) => {
      // If inside order wizard, let the scene handle it
      if ((ctx as any)?.scene?.current?.id === "order-wizard") return next();
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

    // Payment callbacks (pay:<orderId>:<method>)
    this.bot.on("callback_query", async (ctx: any, next: any) => {
      const data: string = ctx.callbackQuery?.data || "";
      if (!data.startsWith("pay:")) return next();
      try {
        const parts = data.split(":");
        const id = Number(parts[1]);
        const method = parts[2];
        if (!id || !method) return ctx.answerCbQuery().catch(() => {});
        const orderRepo = AppDataSource.getRepository(Order);
        const payRepo = AppDataSource.getRepository(Payment);
        const order = await orderRepo.findOne({ where: { id } });
        if (!order) return ctx.answerCbQuery().catch(() => {});
        let payment = await payRepo.findOne({ where: { order: { id } as any } });
        if (!payment) payment = payRepo.create({ order, amount: order.price, status: "PENDING" });
        payment.provider = method;
        payment.status = "SUCCESS";
        await payRepo.save(payment);
        order.status = "COMPLETED" as any;
        (order as any).completedAt = new Date();
        await orderRepo.save(order);
        await ctx.answerCbQuery(await t(ctx, "payment.successCb"));
        const methodName = method === "CASH" ? await t(ctx, "payment.method.cash") : await t(ctx, "payment.method.card");
        await ctx.editMessageText(
          await t(ctx, "payment.updatedMsg", { amount: (order.price || 0).toFixed(2), method: methodName })
        ).catch(() => {});
      } catch (e) {
        console.error("pay callback error", e);
        try { await ctx.answerCbQuery(); } catch {}
      }
    });
  }

  private async handleStart(ctx: Context): Promise<void> {
    try {
      const from: any = (ctx as any).message?.from || (ctx as any).from;
      if (!from) return;
      const user = await this.userService.findOrCreateUser(from);
      const name = user.firstName || from.first_name || "";
      await ctx.reply(await t(ctx, "start.welcome", { name }));
      await this.sendMainMenu(ctx);
    } catch (error) {
      console.error("Start handler error:", error);
      await ctx.reply(await t(ctx, "errors.common"));
    }
  }

  private async handleUsersCommand(ctx: Context): Promise<void> {
    try {
      const users = await this.userService.getAllUsers();
      const userCount = users.length;
      await ctx.reply(await t(ctx, "admin.usersCount", { count: userCount }));
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
      // Ensure long polling by removing any webhook and pending updates
      try {
        await this.bot.telegram.deleteWebhook({ drop_pending_updates: true });
      } catch (e) {
        // ignore if no webhook set
      }
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
        await t(ctx, "register.askPhone"),
        Markup.keyboard([Markup.button.contactRequest(await t(ctx, "register.askPhoneButton"))]).oneTime().resize()
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
          await ctx.reply(await t(ctx, "register.invalidPhone"));
          return;
        }
        const userRepo = AppDataSource.getRepository(User);
        await userRepo.update({ telegramId: String(ctx.from.id) as any }, { phone });
        await ctx.reply(await t(ctx, "register.saved"), Markup.removeKeyboard());
        return ctx.scene.leave();
      } catch (e) {
        console.error("Register save error", e);
        await ctx.reply(await t(ctx, "errors.common"));
        return ctx.scene.leave();
      }
    };

    return new Scenes.WizardScene("register-wizard", askPhone as any, savePhone as any);
  }

  private createOrderWizard(): Scenes.WizardScene<Scenes.WizardContext> {
    // Step 1: choose driver via inline keyboard
    const chooseDriver = async (ctx: any) => {
      const driverRepo = AppDataSource.getRepository(Driver);
      const drivers = await driverRepo.find({ where: { status: 'APPROVED' }, order: { rating: 'DESC' } });
      if (!drivers.length) {
        await ctx.reply(await t(ctx, "order.noDrivers"));
        return ctx.scene.leave();
      }
      const rows = drivers.slice(0, 30).map((d: any) => [Markup.button.callback(`${d.name} (${d.phone})`, `drv:${d.id}`)]);
      await ctx.reply(
        await t(ctx, "order.chooseDriver"),
        Markup.inlineKeyboard(rows)
      );
      return ctx.wizard.next();
    };

    // Step 2: handle driver selection callback then ask pickup
    const captureDriverThenAskPickup = async (ctx: any) => {
      const state: any = (ctx.wizard.state ||= {});
      if (ctx.updateType === 'callback_query' && ctx.callbackQuery?.data?.startsWith('drv:')) {
        const id = Number(ctx.callbackQuery.data.split(':')[1]);
        state.driverId = id;
        await (ctx as any).answerCbQuery();
        await ctx.reply(
          await t(ctx, "order.askPickup"),
          Markup.keyboard([Markup.button.locationRequest(await t(ctx, "order.askPickupButton"))]).oneTime().resize()
        );
        return ctx.wizard.next();
      } else if (ctx.message?.text) {
        // ignore stray text, wait for driver selection
        return;
      } else {
        return;
      }
    };

    // Step 3: capture pickup, ask dropoff
    const capturePickup = async (ctx: any) => {
      const state: any = ctx.wizard.state;
      if (ctx.message?.location) {
        const { latitude, longitude } = ctx.message.location;
        state.pickup = { latitude, longitude };
      } else if (ctx.message?.text) {
        state.pickup = { address: ctx.message.text };
      } else {
        await ctx.reply(await t(ctx, "order.askPickup"));
        return;
      }
      await ctx.reply(await t(ctx, "order.askDropoff"));
      return ctx.wizard.next();
    };

    // Step 4: capture dropoff and create order
    const captureDropoffAndCreate = async (ctx: any) => {
      const state: any = ctx.wizard.state;
      if (ctx.message?.location) {
        const { latitude, longitude } = ctx.message.location;
        state.dropoff = { latitude, longitude };
      } else if (ctx.message?.text) {
        state.dropoff = { address: ctx.message.text };
      } else {
        await ctx.reply(await t(ctx, "order.askDropoff"));
        return;
      }
      await ctx.reply(await t(ctx, "order.creating"));

      try {
        const userRepo = AppDataSource.getRepository(User);
        let user = await userRepo.findOne({ where: { telegramId: String(ctx.from.id) } });
        if (!user) {
          user = await this.userService.findOrCreateUser(ctx.from);
        }

        const orderRepo = AppDataSource.getRepository(Order);
        const order = orderRepo.create({
          user,
          status: (state.driverId ? "ASSIGNED" : "PENDING") as any,
          pickupLocation: state.pickup,
          dropoffLocation: state.dropoff,
          price: 0,
          driver: state.driverId ? ({ id: state.driverId } as any) : undefined,
        });
        await orderRepo.save(order);
        try {
          if ((order as any).driver?.id) {
            const io = getIO();
            io.to(`driver:${(order as any).driver.id}`).emit("order.assigned", order);
          }
        } catch {}

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
            `New order #${(order as any).id} from ${ctx.from.first_name || "User"} (@${ctx.from.username || "-"})\n` +
              `Driver: ${state.driverId ? `#${state.driverId}` : 'not assigned'}\n` +
              `Pickup: ${mapsLinkPickup}\nDropoff: ${mapsLinkDrop}`
          );
          if (state.pickup?.latitude) {
            await this.bot.telegram.sendLocation(adminChatId, state.pickup.latitude, state.pickup.longitude);
          }
          if (state.dropoff?.latitude) {
            await this.bot.telegram.sendLocation(adminChatId, state.dropoff.latitude, state.dropoff.longitude);
          }
        }

        await ctx.reply(await t(ctx, "order.created", { id: (order as any).id }));
      } catch (e) {
        console.error("Order creation error", e);
        await ctx.reply(await t(ctx, "errors.common"));
      }

      return ctx.scene.leave();
    };

    return new Scenes.WizardScene(
      "order-wizard",
      chooseDriver as any,
      captureDriverThenAskPickup as any,
      capturePickup as any,
      captureDropoffAndCreate as any
    );
  }

  private async sendMainMenu(ctx: any) {
    const order = await t(ctx, "menu.order");
    const register = await t(ctx, "menu.register");
    const language = await t(ctx, "menu.language");
    await ctx.reply(
      await t(ctx, "start.menuHint"),
      Markup.keyboard([[order], [register], [language]]).resize()
    );
  }

  private async showLanguageMenu(ctx: any) {
    await ctx.reply(
      await t(ctx, "lang.choose"),
      Markup.inlineKeyboard([
        [Markup.button.callback("Русский", "lang:ru"), Markup.button.callback("O‘zbekcha", "lang:uz")],
      ])
    );
  }
}

