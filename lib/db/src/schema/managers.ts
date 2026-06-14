import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const managersTable = pgTable("managers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  employeeCode: text("employee_code").notNull().unique(),
  email: text("email").notNull(),
  mobile: text("mobile").notNull(),
  region: text("region").notNull(),
  headquarters: text("headquarters").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  targetDoctors: integer("target_doctors").notNull().default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertManagerSchema = createInsertSchema(managersTable).omit({ id: true, createdAt: true });
export type InsertManager = z.infer<typeof insertManagerSchema>;
export type Manager = typeof managersTable.$inferSelect;
