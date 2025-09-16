import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { RefreshToken } from "./RefreshToken";

export type AdminRole = "SUPER_ADMIN" | "MANAGER";

@Entity()
export class Admin {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({ type: "varchar", default: "MANAGER" })
  role!: AdminRole;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => RefreshToken, (rt) => rt.admin)
  refreshTokens!: RefreshToken[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

