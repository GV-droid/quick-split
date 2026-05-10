import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

process.env.QUICK_SPLIT_DB_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), 'quick-split-classifier-')),
  'test.sqlite',
);

const { db, migrate } = await import('../db/index.js');
const { customMenuMappings } = await import('../db/schema.js');
const { classifyMenuItem, classifyMenuItems } = await import('./menuClassifier.js');
const { seedDefaultMenuItems } = await import('./menuSeeder.js');

migrate();
await seedDefaultMenuItems();

test('classifies seeded menu items with exact and OCR-corrected matching', async () => {
  const classifications = await classifyMenuItems(db, [
    'Paneer Butter Masala',
    'Chicken Biryani',
    'C0ke',
    'Brownie',
    'Beer',
  ]);

  assert.deepEqual(
    classifications.map(({ category }) => category),
    ['veg', 'nonveg', 'drink', 'dessert', 'alcohol'],
  );
  assert.equal(classifications[2].matchedItem, 'Coke');
  assert.equal(classifications[2].confidence, 1);
});

test('returns unknown when fuzzy confidence is below the threshold', async () => {
  const classification = await classifyMenuItem(db, 'Unlisted Mystery Bowl');

  assert.equal(classification.category, 'unknown');
  assert.ok(classification.confidence < 0.68);
});

test('prefers custom corrected mappings over defaults', async () => {
  await db.insert(customMenuMappings).values({
    itemName: 'House Special Soda',
    category: 'alcohol',
    aliases: JSON.stringify(['Soda Special']),
    updatedAt: new Date().toISOString(),
  });

  const classification = await classifyMenuItem(db, 'Soda Special');

  assert.equal(classification.category, 'alcohol');
  assert.equal(classification.matchType, 'exact');
  assert.equal(classification.matchedItem, 'House Special Soda');
});
