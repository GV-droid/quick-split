import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateSplit } from './splitter.js';

const participants = [
  {
    id: 'rahul',
    name: 'Rahul',
    isVeg: false,
    isNonVeg: true,
    drinks: true,
    dessert: false,
    alcohol: true,
  },
  {
    id: 'priya',
    name: 'Priya',
    isVeg: true,
    isNonVeg: false,
    drinks: false,
    dessert: true,
    alcohol: false,
  },
];

test('splits category items and extras only across eligible participants', () => {
  const summary = calculateSplit({
    participants,
    items: [
      { id: 'paneer', name: 'Paneer Butter Masala', amount: 260, category: 'veg' },
      { id: 'biryani', name: 'Chicken Biryani', amount: 320, category: 'nonveg' },
      { id: 'coke', name: 'Coke', amount: 80, category: 'drink' },
      { id: 'brownie', name: 'Brownie', amount: 120, category: 'dessert' },
      { id: 'beer', name: 'Beer', amount: 200, category: 'alcohol' },
      { id: 'naan', name: 'Naan Basket', amount: 100, category: 'shared' },
    ],
    charges: { tax: 108, serviceCharge: 0, tip: 0 },
  });

  assert.equal(summary.allocatedSubtotal, 1080);
  assert.equal(summary.charges.tax, 108);
  assert.equal(summary.unassignedAmount, 0);
  assert.equal(summary.grandTotal, 1188);

  const rahul = summary.participants.find((row) => row.participantId === 'rahul');
  const priya = summary.participants.find((row) => row.participantId === 'priya');

  assert.equal(rahul.categories.nonveg, 320);
  assert.equal(rahul.categories.drink, 80);
  assert.equal(rahul.categories.alcohol, 200);
  assert.equal(rahul.categories.shared, 50);
  assert.equal(rahul.itemSubtotal, 650);
  assert.equal(rahul.extraCharges, 65);
  assert.equal(rahul.total, 715);

  assert.equal(priya.categories.veg, 260);
  assert.equal(priya.categories.dessert, 120);
  assert.equal(priya.categories.shared, 50);
  assert.equal(priya.itemSubtotal, 430);
  assert.equal(priya.extraCharges, 43);
  assert.equal(priya.total, 473);
});

test('reports item and extra amounts as unassigned when nothing is eligible', () => {
  const summary = calculateSplit({
    participants: [
      {
        id: 'solo',
        name: 'Solo',
        isVeg: true,
        isNonVeg: false,
        drinks: false,
        dessert: false,
        alcohol: false,
      },
    ],
    items: [{ id: 'beer', name: 'Beer', amount: 200, category: 'alcohol' }],
    charges: { tax: 20, serviceCharge: 0, tip: 0 },
  });

  assert.equal(summary.allocatedSubtotal, 0);
  assert.equal(summary.unassignedAmount, 220);
  assert.equal(summary.grandTotal, 20);
  assert.equal(summary.warnings.length, 2);
});
