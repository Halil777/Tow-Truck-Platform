import { Entity, PrimaryGeneratedColumn, Column, Index, UpdateDateColumn, CreateDateColumn } from "typeorm";

@Entity()
export class Setting {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ length: 120 })
  key!: string; // e.g., pricing.rules, service.areas, notification.email

  @Column({ type: "jsonb" })
  value!: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

