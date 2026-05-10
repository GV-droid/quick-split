import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanOcrText, mergeClassifications, parseReceiptText } from './ocr.js';

test('cleans common OCR mistakes before parsing receipt rows', () => {
  const cleaned = cleanOcrText('C0ke 80\nPanner Butter Masla 260\nB1ryani 320');

  assert.match(cleaned, /Coke 80/);
  assert.match(cleaned, /Paneer Butter Masala 260/);
  assert.match(cleaned, /Biryani 320/);
});

test('parses noisy single-line OCR text into structured bill items', () => {
  const rows = parseReceiptText('Chicken Biryani 320 Paneer Butter Masala 260 C0ke 80');

  assert.deepEqual(
    rows.map(({ name, amount, price, category }) => ({ name, amount, price, category })),
    [
      { name: 'Chicken Biryani', amount: '320.00', price: 320, category: 'nonveg' },
      { name: 'Paneer Butter Masala', amount: '260.00', price: 260, category: 'veg' },
      { name: 'Coke', amount: '80.00', price: 80, category: 'drink' },
    ],
  );
});

test('extracts quantity markers when OCR includes them near the item name', () => {
  const [row] = parseReceiptText('2 x Paneer Tikka 420');

  assert.equal(row.name, 'Paneer Tikka');
  assert.equal(row.quantity, 2);
  assert.equal(row.price, 420);
});

test('uses item table headers and ignores bill metadata and totals', () => {
  const rows = parseReceiptText(`
    TAX INVOICE
    Date 10/05/2026
    Table 7
    Item Qty Amount
    Chicken Biryani 1 320
    Paneer Butter Masala 1 260
    Coke 2 160
    Subtotal 740
    CGST 37
    Bill Total 777
  `);

  assert.deepEqual(
    rows.map(({ name, amount, quantity }) => ({ name, amount, quantity })),
    [
      { name: 'Chicken Biryani', amount: '320.00', quantity: 1 },
      { name: 'Paneer Butter Masala', amount: '260.00', quantity: 1 },
      { name: 'Coke', amount: '160.00', quantity: 2 },
    ],
  );
});

test('does not treat standalone date and total lines as bill items', () => {
  const rows = parseReceiptText(`
    Date 10 05 2026
    Chicken Biryani 320
    Total 320
  `);

  assert.deepEqual(
    rows.map(({ name, amount }) => ({ name, amount })),
    [{ name: 'Chicken Biryani', amount: '320.00' }],
  );
});

test('filters hotel names, dates, and subtotal lines when they include amounts', () => {
  const rows = parseReceiptText(`
    Hotel Blue Moon 9988776655
    Date 10 05 2026
    Bill No 1245
    Item Qty Rate Amount
    Chicken Biryani 1 320 320
    Coke 1 80 80
    Hotel Service 1800
    Sub Total 400
    GST 20
    Grand Total 420
  `);

  assert.deepEqual(
    rows.map(({ name, amount }) => ({ name, amount })),
    [
      { name: 'Chicken Biryani', amount: '320.00' },
      { name: 'Coke', amount: '80.00' },
    ],
  );
});

test('uses the line total instead of rate when receipt rows include quantity, rate, and amount', () => {
  const rows = parseReceiptText(`
    Item Qty Rate Amount
    Chicken Biryani 1 320 320
    Coke 2 80 160
  `);

  assert.deepEqual(
    rows.map(({ name, amount, quantity }) => ({ name, amount, quantity })),
    [
      { name: 'Chicken Biryani', amount: '320.00', quantity: 1 },
      { name: 'Coke', amount: '160.00', quantity: 2 },
    ],
  );
});

test('merges local API classifications into review rows and keeps unknown rows editable', () => {
  const [row] = mergeClassifications(
    [{ id: 'one', name: 'Mystery Special', amount: '100.00', category: 'shared' }],
    [
      {
        name: 'Mystery Special',
        category: 'unknown',
        confidence: 0.41,
        matchType: 'fuzzy',
        matchedItem: null,
        normalizedName: 'mystery special',
      },
    ],
  );

  assert.equal(row.category, 'shared');
  assert.equal(row.detectedCategory, 'unknown');
  assert.equal(row.confidence, 0.41);
});
