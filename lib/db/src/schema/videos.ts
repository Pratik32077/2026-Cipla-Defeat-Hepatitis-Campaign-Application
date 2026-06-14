import { pgTable, serial, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { doctorsTable } from "./doctors";
import { managersTable } from "./managers";

export const videosTable = pgTable("videos", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => doctorsTable.id),
  managerId: integer("manager_id").notNull().references(() => managersTable.id),
  status: text("status").notNull().default("pending"),
  videoUrl: text("video_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  doctorIdx: index("video_doctor_idx").on(table.doctorId),
  managerIdx: index("video_manager_idx").on(table.managerId),
  statusIdx: index("video_status_idx").on(table.status),
}));

export const insertVideoSchema = createInsertSchema(videosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videosTable.$inferSelect;
