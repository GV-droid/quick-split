import { count } from 'drizzle-orm';
import { db, persist } from '../db/index.js';
import { menuItems } from '../db/schema.js';
import { defaultMenuItems } from './menuSeedData.js';

export async function seedDefaultMenuItems() {
  const [{ value }] = await db.select({ value: count() }).from(menuItems);
  if (value >= defaultMenuItems.length) return;

  await db.insert(menuItems).values(defaultMenuItems).onConflictDoNothing();
  persist();
}
