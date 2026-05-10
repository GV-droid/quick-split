import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

process.env.QUICK_SPLIT_DB_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), 'quick-split-api-')),
  'test.sqlite',
);

const { createApp } = await import('../app.js');
const { migrate } = await import('../db/index.js');
const { seedDefaultMenuItems } = await import('../services/menuSeeder.js');

migrate();
await seedDefaultMenuItems();

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}/api` });
    });
  });
}

async function request(baseUrl, pathName, options = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  return payload;
}

test('creates a session, classifies OCR-style items, imports them, and returns a split summary', async () => {
  const { server, baseUrl } = await listen(createApp());

  try {
    const created = await request(baseUrl, '/sessions', {
      method: 'POST',
      body: JSON.stringify({ title: 'OCR Integration Dinner' }),
    });
    const sessionId = created.session.id;

    await request(baseUrl, `/sessions/${sessionId}/participants`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Rahul',
        isVeg: false,
        isNonVeg: true,
        drinks: true,
        dessert: false,
        alcohol: true,
      }),
    });
    await request(baseUrl, `/sessions/${sessionId}/participants`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Priya',
        isVeg: true,
        isNonVeg: false,
        drinks: false,
        dessert: true,
        alcohol: false,
      }),
    });

    const { classifications } = await request(baseUrl, '/menu-mappings/classify', {
      method: 'POST',
      body: JSON.stringify({
        names: ['Chicken Biryani', 'Paneer Butter Masala', 'C0ke', 'Brownie', 'Beer'],
      }),
    });

    assert.deepEqual(
      classifications.map(({ category }) => category),
      ['nonveg', 'veg', 'drink', 'dessert', 'alcohol'],
    );

    for (const item of [
      ['Chicken Biryani', 320, classifications[0].category],
      ['Paneer Butter Masala', 260, classifications[1].category],
      ['Coke', 80, classifications[2].category],
      ['Brownie', 120, classifications[3].category],
      ['Beer', 200, classifications[4].category],
    ]) {
      await request(baseUrl, `/sessions/${sessionId}/items`, {
        method: 'POST',
        body: JSON.stringify({ name: item[0], amount: item[1], category: item[2] }),
      });
    }

    await request(baseUrl, `/sessions/${sessionId}/charges`, {
      method: 'PUT',
      body: JSON.stringify({ tax: 98, serviceCharge: 0, tip: 0 }),
    });

    const { summary } = await request(baseUrl, `/sessions/${sessionId}/summary`);

    assert.equal(summary.itemCount, 5);
    assert.equal(summary.allocatedSubtotal, 980);
    assert.equal(summary.unassignedAmount, 0);
    assert.equal(summary.grandTotal, 1078);

    const rahul = summary.participants.find((row) => row.name === 'Rahul');
    const priya = summary.participants.find((row) => row.name === 'Priya');

    assert.equal(rahul.itemSubtotal, 600);
    assert.equal(rahul.extraCharges, 60);
    assert.equal(rahul.total, 660);
    assert.equal(priya.itemSubtotal, 380);
    assert.equal(priya.extraCharges, 38);
    assert.equal(priya.total, 418);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('deletes a session and cascades related bill data', async () => {
  const { server, baseUrl } = await listen(createApp());

  try {
    const created = await request(baseUrl, '/sessions', {
      method: 'POST',
      body: JSON.stringify({ title: 'Delete Me' }),
    });
    const sessionId = created.session.id;

    await request(baseUrl, `/sessions/${sessionId}/participants`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Asha',
        isVeg: true,
        isNonVeg: false,
        drinks: false,
        dessert: false,
        alcohol: false,
      }),
    });
    await request(baseUrl, `/sessions/${sessionId}/items`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Paneer Tikka', amount: 200, category: 'veg' }),
    });

    await request(baseUrl, `/sessions/${sessionId}`, { method: 'DELETE' });
    const { sessions } = await request(baseUrl, '/sessions');

    assert.equal(sessions.some((entry) => entry.id === sessionId), false);

    const response = await fetch(`${baseUrl}/sessions/${sessionId}`);
    assert.equal(response.status, 404);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});
