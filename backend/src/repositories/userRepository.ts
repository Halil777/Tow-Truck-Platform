import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { User } from "../entities/User";

export class UserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  async findByTelegramId(telegramId: number | string): Promise<User | null> {
    return await this.repository.findOne({ where: { telegramId: telegramId.toString() as any } });
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return await this.repository.save(user);
  }

  async updateUser(
    telegramId: number | string,
    userData: Partial<User>
  ): Promise<User | null> {
    await this.repository.update({ telegramId: telegramId.toString() as any }, userData);
    return await this.findByTelegramId(telegramId);
  }

  async getAllUsers(): Promise<User[]> {
    return await this.repository.find();
  }
}
