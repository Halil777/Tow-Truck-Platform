import bcrypt from "bcryptjs";
import { Admin } from "../entities/Admin";
import { AppDataSource } from "../config/database";
import { AdminRepository } from "../repositories/adminRepository";
import { RefreshTokenRepository } from "../repositories/refreshTokenRepository";
import { signAccessToken, signRefreshToken, JwtPayload, verifyRefreshToken } from "../utils/jwt";

export class AdminService {
  private adminRepo: AdminRepository;
  private rtRepo: RefreshTokenRepository;
  constructor() {
    this.adminRepo = new AdminRepository();
    this.rtRepo = new RefreshTokenRepository();
  }

  async ensureAdminFromEnv() {
    const email = (process.env.SUPER_ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
    const password = process.env.SUPER_ADMIN_PASSWORD || "changeme";
    let admin = await this.adminRepo.findByEmail(email);
    const passwordHash = await bcrypt.hash(password, 10);
    if (!admin) {
      await this.adminRepo.create({ email, passwordHash, role: "SUPER_ADMIN", name: "Super Admin", isActive: true });
      return;
    }
    // Ensure role and active, and update password if changed
    admin.role = "SUPER_ADMIN";
    admin.isActive = true;
    admin.passwordHash = passwordHash;
    await (AppDataSource.getRepository as any)(Admin).save(admin);
  }

  async seedSuperAdminIfEmpty() {
    const email = (process.env.SUPER_ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
    const password = process.env.SUPER_ADMIN_PASSWORD || "changeme";
    const existing = await this.adminRepo.findByEmail(email);
    if (!existing) {
      const passwordHash = await bcrypt.hash(password, 10);
      await this.adminRepo.create({ email, passwordHash, role: "SUPER_ADMIN", name: "Super Admin", isActive: true });
    }
  }

  async login(email: string, password: string) {
    const emailNorm = (email || "").trim().toLowerCase();
    const admin = await this.adminRepo.findByEmail(emailNorm);
    if (!admin || !admin.isActive) throw new Error("Invalid credentials");
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) throw new Error("Invalid credentials");
    const payload: JwtPayload = { sub: String(admin.id), role: admin.role, email: admin.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const ttlMs = this.parseTtl(process.env.JWT_REFRESH_TTL || "30d") || this.parseTtl("30d");
    const expiresAt = new Date(Date.now() + ttlMs);
    await this.rtRepo.save({ token: refreshToken, admin, expiresAt });
    return { accessToken, refreshToken, admin: { id: admin.id, email: admin.email, role: admin.role, name: admin.name } };
  }

  async refresh(token: string) {
    const stored = await this.rtRepo.findByToken(token);
    if (!stored) throw new Error("Invalid refresh token");
    if (stored.expiresAt.getTime() < Date.now()) {
      await this.rtRepo.deleteById(stored.id);
      throw new Error("Expired refresh token");
    }
    const decoded = verifyRefreshToken(token);
    const payload: JwtPayload = { sub: decoded.sub, role: decoded.role, email: decoded.email };
    const accessToken = signAccessToken(payload);
    return { accessToken };
  }

  private parseTtl(ttl: string): number {
    // simple parser for "30d", "15m", "1h"
    const m = ttl.match(/^(\d+)([smhd])$/);
    if (!m) return 0;
    const n = parseInt(m[1], 10);
    const u = m[2];
    switch (u) {
      case "s":
        return n * 1000;
      case "m":
        return n * 60 * 1000;
      case "h":
        return n * 60 * 60 * 1000;
      case "d":
        return n * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }
}
