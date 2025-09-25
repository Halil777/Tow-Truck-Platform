import { AppDataSource } from "../config/database";
import { User } from "../entities/User";

export type Lang = "ru" | "uz";

const fallbackLang: Lang = "ru";

export const langNames: Record<Lang, string> = {
  ru: "Русский",
  uz: "O‘zbekcha",
};

const messages: Record<Lang, any> = {
  ru: {
    start: {
      welcome: "Добро пожаловать, {name}!",
      menuHint: "Выберите действие ниже.",
    },
    help: {
      text:
        "Доступные команды:\n" +
        "/start — главное меню\n" +
        "/order — создать заявку\n" +
        "/register — оставить номер телефона\n" +
        "/language — сменить язык",
    },
    menu: {
      order: "🚚 Заказать эвакуатор",
      register: "📞 Оставить номер",
      language: "🌐 Язык",
    },
    lang: {
      choose: "Выберите язык:",
      set: "Язык переключён: {langName}",
      name: { ru: "Русский", uz: "O‘zbekcha" },
    },
    register: {
      askPhone: "Пожалуйста, отправьте номер телефона или нажмите кнопку ниже.",
      askPhoneButton: "📱 Отправить телефон",
      saved: "Номер сохранён. Спасибо!",
      invalidPhone:
        "Не удалось распознать номер. Отправьте контакт или введите номер текстом.",
    },
    order: {
      noDrivers: "Нет доступных водителей. Попробуйте позже.",
      chooseDriver: "Выберите водителя:",
      askPickup: "Отправьте место подачи (локация или текст).",
      askPickupButton: "📍 Отправить локацию",
      askDropoff: "Отправьте место назначения (локация или текст).",
      creating: "Создаём заявку...",
      created: "Заявка создана. Номер: #{id}. Спасибо!",
    },
    payment: {
      successCb: "Оплата принята",
      method: { cash: "Наличные", card: "Карта" },
      updatedMsg: "Оплата: {amount}, способ: {method}",
    },
    admin: { usersCount: "Пользователей в системе: {count}" },
    errors: { common: "Произошла ошибка. Попробуйте позже." },
    generic: { thanks: "Спасибо." },
  },
  uz: {
    start: {
      welcome: "Xush kelibsiz, {name}!",
      menuHint: "Quyidagi amalni tanlang.",
    },
    help: {
      text:
        "Mavjud buyruqlar:\n" +
        "/start — bosh menyu\n" +
        "/order — buyurtma yaratish\n" +
        "/register — telefon raqamini qoldirish\n" +
        "/language — tilni o‘zgartirish",
    },
    menu: {
      order: "🚚 Evakuator chaqirish",
      register: "📞 Telefon raqamini qoldirish",
      language: "🌐 Til",
    },
    lang: {
      choose: "Tilni tanlang:",
      set: "Til o‘zgartirildi: {langName}",
      name: { ru: "Русский", uz: "O‘zbekcha" },
    },
    register: {
      askPhone: "Iltimos, telefon raqamingizni yuboring yoki pastdagi tugmani bosing.",
      askPhoneButton: "📱 Telefonni yuborish",
      saved: "Raqam saqlandi. Rahmat!",
      invalidPhone:
        "Telefon raqamini aniqlab bo‘lmadi. Kontakt yuboring yoki raqamni matn bilan yozing.",
    },
    order: {
      noDrivers: "Hozircha haydovchilar yo‘q. Keyinroq urinib ko‘ring.",
      chooseDriver: "Haydovchini tanlang:",
      askPickup: "Jo'nash manzilini yuboring (joylashuv yoki matn).",
      askPickupButton: "📍 Joylashuvni yuborish",
      askDropoff: "Boriladigan manzilni yuboring (joylashuv yoki matn).",
      creating: "Buyurtma yaratilmoqda...",
      created: "Buyurtma yaratildi. Raqam: #{id}. Rahmat!",
    },
    payment: {
      successCb: "To‘lov qabul qilindi",
      method: { cash: "Naqd", card: "Karta" },
      updatedMsg: "To‘lov: {amount}, usul: {method}",
    },
    admin: { usersCount: "Tizimdagi foydalanuvchilar: {count}" },
    errors: { common: "Xatolik yuz berdi. Keyinroq urinib ko‘ring." },
    generic: { thanks: "Rahmat." },
  },
};

function deepGet(obj: any, path: string): string | undefined {
  return path.split(".").reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function applyParams(text: string, params?: Record<string, any>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : ""));
}

export function resolveLangCode(code?: string): Lang {
  const v = String(code || "").toLowerCase();
  if (v.startsWith("uz")) return "uz";
  if (v.startsWith("ru")) return "ru";
  return fallbackLang;
}

export async function getUserLanguageByTelegramId(telegramId: string): Promise<Lang> {
  try {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { telegramId } });
    return (user?.language as Lang) || fallbackLang;
  } catch {
    return fallbackLang;
  }
}

export async function setUserLanguageByTelegramId(telegramId: string, lang: Lang): Promise<void> {
  const repo = AppDataSource.getRepository(User);
  await repo.update({ telegramId }, { language: lang });
}

export async function t(ctx: any, key: string, params?: Record<string, any>): Promise<string> {
  const lang = await getUserLanguageByTelegramId(String(ctx.from?.id || ctx.chat?.id || ""));
  const raw = deepGet(messages[lang], key) || deepGet(messages[fallbackLang], key) || key;
  return applyParams(String(raw), params);
}

export function getLangName(lang: Lang): string {
  return langNames[lang] || String(lang);
}

