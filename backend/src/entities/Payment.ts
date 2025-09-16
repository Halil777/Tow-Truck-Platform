import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Order } from "./Order";

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

@Entity()
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Order, (order) => order.payment)
  order!: Order;

  @Column({ type: "float" })
  amount!: number;

  @Column({ type: "varchar", default: "PENDING" })
  status!: PaymentStatus;

  @Column({ nullable: true })
  provider?: string;

  @Column({ nullable: true })
  reference?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

