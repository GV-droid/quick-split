import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: text('created_at').notNull(),
});

export const participants = sqliteTable('participants', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isVeg: integer('is_veg', { mode: 'boolean' }).notNull().default(false),
  isNonVeg: integer('is_nonveg', { mode: 'boolean' }).notNull().default(false),
  drinks: integer('drinks', { mode: 'boolean' }).notNull().default(false),
  dessert: integer('dessert', { mode: 'boolean' }).notNull().default(false),
  alcohol: integer('alcohol', { mode: 'boolean' }).notNull().default(false),
});

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  category: text('category', {
    enum: ['veg', 'nonveg', 'drink', 'dessert', 'alcohol', 'shared'],
  }).notNull(),
});

export const sessionCharges = sqliteTable('session_charges', {
  sessionId: text('session_id')
    .primaryKey()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  tax: real('tax').notNull().default(0),
  serviceCharge: real('service_charge').notNull().default(0),
  tip: real('tip').notNull().default(0),
});

export const menuItems = sqliteTable('menu_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemName: text('item_name').notNull().unique(),
  category: text('category', {
    enum: ['veg', 'nonveg', 'drink', 'dessert', 'alcohol', 'shared', 'unknown'],
  }).notNull(),
  aliases: text('aliases').notNull().default('[]'),
});

export const customMenuMappings = sqliteTable('custom_menu_mappings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemName: text('item_name').notNull().unique(),
  category: text('category', {
    enum: ['veg', 'nonveg', 'drink', 'dessert', 'alcohol', 'shared', 'unknown'],
  }).notNull(),
  aliases: text('aliases').notNull().default('[]'),
  updatedAt: text('updated_at').notNull(),
});
