import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Admin } from "../entities/Admin";

export class AdminRepository {
  private repository: Repository<Admin>;
  constructor() {
    this.repository = AppDataSource.getRepository(Admin);
  }

  findByEmail(email: string) {
    return this.repository.findOne({ where: { email } });
  }

  create(data: Partial<Admin>) {
    const admin = this.repository.create(data);
    return this.repository.save(admin);
  }
}

