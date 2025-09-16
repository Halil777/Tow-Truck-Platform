import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Order } from "./Order";
import { Review } from "./Review";

export type DriverStatus = "PENDING" | "APPROVED" | "REJECTED";

@Entity()
export class Driver {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  name!: string;

  @Column({ length: 32, unique: true })
  phone!: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: "varchar", default: "PENDING" })
  status!: DriverStatus;

  @Column({ default: false })
  online!: boolean;

  @Column({ type: "float", default: 0 })
  rating!: number;

  @Column({ type: "int", default: 0 })
  completedOrders!: number;

  @OneToMany(() => Order, (order) => order.driver)
  orders!: Order[];

  @OneToMany(() => Review, (review) => review.driver)
  reviews!: Review[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

