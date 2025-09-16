import { Repository, ILike } from "typeorm";
import { AppDataSource } from "../config/database";
import { Admin } from "../entities/Admin";

export class AdminRepository {
  private repository: Repository<Admin>;
  constructor() {
    this.repository = AppDataSource.getRepository(Admin);
  }

  findByEmail(email: string) {
    // Case-insensitive match to avoid login issues due to casing
    return this.repository.findOne({ where: { email: ILike(email) } });
  }

  create(data: Partial<Admin>) {
    const admin = this.repository.create(data);
    return this.repository.save(admin);
  }
}

