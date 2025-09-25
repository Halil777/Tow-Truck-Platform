import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: "bigint",
    unique: true,
    transformer: {
      to: (value: string | number) => (value !== undefined && value !== null ? value.toString() : value),
      from: (value: string | null) => (value !== null && value !== undefined ? value : ""),
    },
  })
  telegramId!: string;

  @Column()
  firstName!: string;

  @Column({ nullable: true })
  lastName!: string;

  @Column({ nullable: true })
  username!: string;

  @Column({ nullable: true, length: 32 })
  phone?: string;

  @Column({ type: "varchar", length: 5, default: "ru" })
  language!: string;

  @Column({ default: false })
  isBot!: boolean;

  @Column({ default: "user" })
  role!: string;

  @Column({ default: false })
  suspended!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
