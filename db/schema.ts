import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable("workspaces", { brandId: text("brand_id").primaryKey(), payload: text("payload").notNull(), revision: integer("revision").notNull().default(1), updatedAt: text("updated_at").notNull() });
