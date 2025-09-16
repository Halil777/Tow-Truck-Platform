import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { RefreshToken } from "../entities/RefreshToken";

export class RefreshTokenRepository {
  private repository: Repository<RefreshToken>;
  constructor() {
    this.repository = AppDataSource.getRepository(RefreshToken);
  }

  async save(entity: Partial<RefreshToken>) {
    const rt = this.repository.create(entity);
    return this.repository.save(rt);
  }

  findByToken(token: string) {
    return this.repository.findOne({ where: { token }, relations: ["admin"] });
  }

  deleteById(id: number) {
    return this.repository.delete(id);
  }
}

