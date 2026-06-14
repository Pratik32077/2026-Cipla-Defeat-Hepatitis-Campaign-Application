import { pgTable, serial, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { managersTable } from "./managers";

export const doctorsTable = pgTable("doctors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialization: text("specialization").notNull(),
  city: text("city").notNull(),
  contactNumber: text("contact_number").notNull().unique(),
  language: text("language").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("pending"),
  managerId: integer("manager_id").notNull().references(() => managersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  managerIdx: index("doctor_manager_idx").on(table.managerId),
  contactIdx: index("doctor_contact_idx").on(table.contactNumber),
  statusIdx: index("doctor_status_idx").on(table.status),
}));

export const insertDoctorSchema = createInsertSchema(doctorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctorsTable.$inferSelect;
