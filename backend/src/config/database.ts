import { DataSource } from "typeorm";
import { config } from "dotenv";
import { User } from "../entities/User";
import { Admin } from "../entities/Admin";
import { RefreshToken } from "../entities/RefreshToken";
import { Driver } from "../entities/Driver";
import { Order } from "../entities/Order";
import { Payment } from "../entities/Payment";
import { Review } from "../entities/Review";
import { Setting } from "../entities/Setting";

config();

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = parseInt(process.env.DB_PORT || "5432", 10);
const DB_USER = process.env.DB_USER || "postgres";
const DB_PASS = process.env.DB_PASS || "";
const DB_NAME = process.env.DB_NAME || "tow_truck";
const NODE_ENV = process.env.NODE_ENV || "development";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  entities: [User, Admin, RefreshToken, Driver, Order, Payment, Review, Setting],
  synchronize: NODE_ENV !== "production",
  logging: NODE_ENV !== "production",
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log("Database connected!");
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
};

