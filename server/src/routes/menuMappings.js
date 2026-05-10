import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { db, persist } from '../db/index.js';
import { customMenuMappings, menuItems } from '../db/schema.js';
import { classifyMenuItems } from '../services/menuClassifier.js';
import { menuMappingSchema, parseBody } from '../validation.js';

const router = Router();

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

router.get('/', asyncRoute(async (req, res) => {
  const [defaults, custom] = await Promise.all([
    db.select().from(menuItems),
    db.select().from(customMenuMappings),
  ]);

  res.json({ mappings: [...defaults, ...custom] });
}));

router.post('/classify', asyncRoute(async (req, res) => {
  const names = Array.isArray(req.body?.names)
    ? req.body.names.map((name) => String(name || '').trim()).filter(Boolean)
    : [];

  if (names.length === 0) {
    res.json({ classifications: [] });
    return;
  }

  const classifications = await classifyMenuItems(db, names.slice(0, 100));
  res.json({ classifications });
}));

router.put('/:itemName', asyncRoute(async (req, res) => {
  const input = parseBody(menuMappingSchema, {
    ...req.body,
    itemName: req.params.itemName,
  });
  const mapping = {
    ...input,
    aliases: JSON.stringify(input.aliases),
    updatedAt: new Date().toISOString(),
  };

  await db
    .insert(customMenuMappings)
    .values(mapping)
    .onConflictDoUpdate({
      target: customMenuMappings.itemName,
      set: {
        category: mapping.category,
        aliases: mapping.aliases,
        updatedAt: mapping.updatedAt,
      },
    });
  persist();

  const [saved] = await db
    .select()
    .from(customMenuMappings)
    .where(eq(customMenuMappings.itemName, mapping.itemName));

  res.json({ mapping: saved });
}));

export default router;
