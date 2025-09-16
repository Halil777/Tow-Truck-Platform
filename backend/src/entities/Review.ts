import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Driver } from "./Driver";
import { Order } from "./Order";

@Entity()
export class Review {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Driver, (driver) => driver.reviews)
  driver!: Driver;

  @ManyToOne(() => Order)
  order!: Order;

  @Column({ type: "int" })
  rating!: number; // 1..5

  @Column({ type: "text", nullable: true })
  comment?: string;

  @Column({ default: true })
  approved!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}

