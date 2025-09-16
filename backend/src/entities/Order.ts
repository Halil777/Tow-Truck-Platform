import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Driver } from "./Driver";
import { Payment } from "./Payment";

export type OrderStatus =
  | "PENDING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { eager: true })
  user!: User;

  @ManyToOne(() => Driver, (driver) => driver.orders, { nullable: true, eager: true })
  driver?: Driver | null;

  @Column({ type: "varchar", default: "PENDING" })
  status!: OrderStatus;

  @Column({ type: "jsonb", nullable: true })
  pickupLocation?: any;

  @Column({ type: "jsonb", nullable: true })
  dropoffLocation?: any;

  @Column({ type: "float", default: 0 })
  price!: number;

  @Column({ type: "float", default: 0 })
  distanceKm!: number;

  @Column({ type: "int", default: 0 })
  durationMin!: number;

  @OneToOne(() => Payment, (payment) => payment.order, { cascade: true })
  @JoinColumn()
  payment?: Payment;

  @Column({ type: "timestamptz", nullable: true })
  completedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

