import { User } from "../entities/User";
import { UserRepository } from "../repositories/userRepository";

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async findOrCreateUser(telegramUser: any): Promise<User> {
    try {
      let user = await this.userRepository.findByTelegramId(telegramUser.id);

      if (!user) {
        user = await this.userRepository.createUser({
          telegramId: String(telegramUser.id),
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name || "",
          username: telegramUser.username || "",
          isBot: telegramUser.is_bot,
        });
      } else {
        // Update user information if needed
        const updated = await this.userRepository.updateUser(String(telegramUser.id), {
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name || "",
          username: telegramUser.username || "",
        });
        user = (updated as User) ?? user; // ensure non-null
      }

      return user;
    } catch (error) {
      console.error("UserService error:", error);
      throw new Error("User işlemede näsazlyk");
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.getAllUsers();
  }
}
