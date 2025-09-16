import { Telegraf, Context, Markup } from "telegraf";
import { Scenes, session } from "telegraf";
import { UserService } from "./userService";
import { AppDataSource } from "../config/database";
import { Order } from "../entities/Order";
import { User } from "../entities/User";
import { Driver } from "../entities/Driver";
import { getIO } from "../utils/socket";

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
        "Команды:\n/start — запуск бота\n/help — помощь\n/register — регистрация (поделиться телефоном)\n/order — оформить заказ эвакуатора\nТакже вы можете отправить геолокацию."
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

    // Russian menu buttons for non-command usage
    this.bot.hears("Заказать эвакуатор", async (ctx: any) => {
      await ctx.scene.enter("order-wizard");
    });
    this.bot.hears("Поделиться телефоном", async (ctx: any) => {
      await ctx.scene.enter("register-wizard");
    });

    // Payment callbacks (pay:<orderId>:<method>)
    this.bot.on("callback_query", async (ctx: any) => {
      const data: string = ctx.callbackQuery?.data || "";
      if (!data.startsWith("pay:")) return ctx.answerCbQuery().catch(() => {});
      try {
        const parts = data.split(":");
        const id = Number(parts[1]);
        const method = parts[2];
        if (!id || !method) return ctx.answerCbQuery("Некорректные данные").catch(() => {});
        const orderRepo = AppDataSource.getRepository(Order);
        const payRepo = AppDataSource.getRepository(require("../entities/Payment").Payment);
        const order = await orderRepo.findOne({ where: { id } });
        if (!order) return ctx.answerCbQuery("Заказ не найден").catch(() => {});
        let payment = await payRepo.findOne({ where: { order: { id } as any } });
        if (!payment) payment = payRepo.create({ order, amount: order.price, status: "PENDING" });
        payment.provider = method;
        payment.status = "SUCCESS";
        await payRepo.save(payment);
        order.status = "COMPLETED" as any;
        order.completedAt = new Date();
        await orderRepo.save(order);
        await ctx.answerCbQuery("Оплата подтверждена");
        await ctx.editMessageText(
          `Оплата принята: ${order.price.toFixed(2)}₽, способ: ${method === "CASH" ? "Наличные" : "Карта"}`
        ).catch(() => {});
      } catch (e) {
        console.error("pay callback error", e);
        try { await ctx.answerCbQuery("Ошибка оплаты"); } catch {}
      }
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

    // Payment callbacks (pay:<orderId>:<method>) — allow other callbacks to pass through
    this.bot.on("callback_query", async (ctx: any, next: any) => {
      const data: string = ctx.callbackQuery?.data || "";
      if (!data.startsWith("pay:")) return next();
      try {
        const parts = data.split(":");
        const id = Number(parts[1]);
        const method = parts[2];
        if (!id || !method) return ctx.answerCbQuery("Некорректные данные").catch(() => {});
        const orderRepo = AppDataSource.getRepository(Order);
        const payRepo = AppDataSource.getRepository(require("../entities/Payment").Payment);
        const order = await orderRepo.findOne({ where: { id } });
        if (!order) return ctx.answerCbQuery("Заказ не найден").catch(() => {});
        let payment = await payRepo.findOne({ where: { order: { id } as any } });
        if (!payment) payment = payRepo.create({ order, amount: order.price, status: "PENDING" });
        payment.provider = method;
        payment.status = "SUCCESS";
        await payRepo.save(payment);
        order.status = "COMPLETED" as any;
        order.completedAt = new Date();
        await orderRepo.save(order);
        await ctx.answerCbQuery("Оплата подтверждена");
        await ctx.editMessageText(
          `Оплата принята: ${order.price.toFixed(2)}₽, способ: ${method === "CASH" ? "Наличные" : "Карта"}`
        ).catch(() => {});
      } catch (e) {
        console.error("pay callback error", e);
        try { await ctx.answerCbQuery("Ошибка оплаты"); } catch {}
      }
    });
  }

  private async handleStart(ctx: Context): Promise<void> {
    try {
      const from: any = (ctx as any).message?.from || (ctx as any).from;
      if (!from) return;
      const user = await this.userService.findOrCreateUser(from);
      await ctx.reply(
        `Здравствуйте, ${user.firstName || "пользователь"}!\n` +
        `— Нажмите «Заказать эвакуатор», чтобы оформить заказ.\n` +
        `— Нажмите «Поделиться телефоном», чтобы зарегистрироваться.`,
        Markup.keyboard([["Заказать эвакуатор"],["Поделиться телефоном"]]).resize()
      );
    } catch (error) {
      console.error("Start handler error:", error);
      await ctx.reply("Произошла ошибка. Попробуйте позже.");
    }
  }

  private async handleUsersCommand(ctx: Context): Promise<void> {
    try {
      const users = await this.userService.getAllUsers();
      const userCount = users.length;
      await ctx.reply(`Всего пользователей: ${userCount}`);
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
        "Пожалуйста, поделитесь вашим номером телефона",
        Markup.keyboard([Markup.button.contactRequest("Поделиться телефоном")]).oneTime().resize()
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
          await ctx.reply("Отправьте номер телефона или нажмите на кнопку.");
          return;
        }
        const userRepo = AppDataSource.getRepository(User);
        await userRepo.update({ telegramId: String(ctx.from.id) as any }, { phone });
        await ctx.reply("Регистрация завершена. Спасибо!", Markup.removeKeyboard());
        return ctx.scene.leave();
      } catch (e) {
        console.error("Register save error", e);
        await ctx.reply("Не удалось сохранить номер. Попробуйте позже.");
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
        await ctx.reply("Нет доступных водителей сейчас. Попробуйте позже.");
        return ctx.scene.leave();
      }
      const rows = drivers.slice(0, 30).map((d: any) => [Markup.button.callback(`${d.name} (${d.phone})`, `drv:${d.id}`)]);
      await ctx.reply(
        'Выберите водителя:',
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
          "Отправьте место подачи (геолокацию) или напишите адрес.",
          Markup.keyboard([Markup.button.locationRequest('Отправить локацию')]).oneTime().resize()
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
        await ctx.reply("Отправьте геолокацию или напишите адрес.");
        return;
      }
      await ctx.reply("Теперь отправьте место назначения (геолокацию или адрес).");
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
        await ctx.reply("Отправьте геолокацию или напишите адрес.");
        return;
      }
      await ctx.reply("Создаю ваш заказ...");

      try {
        const userRepo = AppDataSource.getRepository(User);
        let user = await userRepo.findOne({ where: { telegramId: String(ctx.from.id) } });
        if (!user) {
          user = await this.userService.findOrCreateUser(ctx.from);
        }

        const orderRepo = AppDataSource.getRepository(Order);
        const order = orderRepo.create({
          user,
          status: state.driverId ? "ASSIGNED" : "PENDING",
          pickupLocation: state.pickup,
          dropoffLocation: state.dropoff,
          price: 0,
          driver: state.driverId ? { id: state.driverId } as any : undefined,
        });
        await orderRepo.save(order);
        try {
          if (order.driver?.id) {
            const io = getIO();
            io.to(`driver:${order.driver.id}`).emit("order.assigned", order);
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
            `Новый заказ #${order.id} от ${ctx.from.first_name || "Пользователь"} (@${ctx.from.username || "-"})\n` +
            `Водитель: ${state.driverId ? `#${state.driverId}` : 'не выбран'}\n` +
            `Откуда: ${mapsLinkPickup}\nКуда: ${mapsLinkDrop}`
          );
          if (state.pickup?.latitude) {
            await this.bot.telegram.sendLocation(adminChatId, state.pickup.latitude, state.pickup.longitude);
          }
          if (state.dropoff?.latitude) {
            await this.bot.telegram.sendLocation(adminChatId, state.dropoff.latitude, state.dropoff.longitude);
          }
        }

        await ctx.reply(`Заказ создан. Номер: ${order.id}. Спасибо!`);
      } catch (e) {
        console.error("Order creation error", e);
        await ctx.reply("Не удалось создать заказ. Попробуйте позже.");
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
}
