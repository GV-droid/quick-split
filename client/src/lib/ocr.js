import { createWorker } from 'tesseract.js';
import { createLocalId } from './id.js';

const amountPattern =
  /(?:rs\.?|inr|₹)?\s*([0-9][0-9,]{1,8}(?:\.[0-9]{1,2})?)(?![0-9])(?=\s|$)/gi;
const headerPattern =
  /\b(item|items|description|particulars|menu|product|name)\b.*\b(qty|quantity|rate|price|amount|amt|total)\b|\b(qty|quantity)\b.*\b(item|items|description|particulars|menu|product|name)\b/i;
const footerPattern =
  /^\s*(bill\s*)?(sub\s*total|subtotal|total|grand\s*total|net\s*amount|amount\s*payable|balance|cash|card|upi|tax|cgst|sgst|igst|gst|vat|service\s*charge|service\s*tax|tip|round\s*off|discount|packing|delivery)\b/i;
const metadataPattern =
  /^\s*(date|time|invoice|bill\s*no|receipt|table|cashier|server|gstin|tin|phone|mobile|address|token|order\s*no|fssai|hotel|restaurant|cafe|bar|diner|kitchen|branch|outlet)\b/i;
const itemHeaderTokenPattern =
  /^(?:s\.?\s*no\.?|no\.?|item|items|description|particulars|menu|product|name|qty|quantity|rate|price|amount|amt|total|mrp|rs\.?|inr|₹)[\s.:-]*/i;

const corrections = [
  [/\bc0ke\b/gi, 'Coke'],
  [/\bpanner\b/gi, 'Paneer'],
  [/\bb1ryani\b/gi, 'Biryani'],
  [/\bbiryam\b/gi, 'Biryani'],
  [/\bchiken\b/gi, 'Chicken'],
  [/\bchickn\b/gi, 'Chicken'],
  [/\bbuter\b/gi, 'Butter'],
  [/\bmasla\b/gi, 'Masala'],
  [/\bbr0wnie\b/gi, 'Brownie'],
  [/\bbeeer\b/gi, 'Beer'],
  [/\bcofee\b/gi, 'Coffee'],
];

const categoryKeywords = {
  veg: [
    'paneer',
    'veg',
    'vegetable',
    'dal',
    'naan',
    'roti',
    'mushroom',
    'gobi',
    'salad',
  ],
  nonveg: ['chicken', 'mutton', 'fish', 'prawn', 'egg', 'meat', 'kebab', 'biryani'],
  drink: ['juice', 'mocktail', 'soda', 'cola', 'tea', 'coffee', 'lassi', 'water', 'coke'],
  dessert: ['dessert', 'ice cream', 'brownie', 'cake', 'kulfi', 'gulab', 'jamun', 'sweet'],
  alcohol: ['beer', 'wine', 'whisky', 'vodka', 'rum', 'gin', 'cocktail', 'tequila'],
};
const menuKeywordPattern = new RegExp(
  Object.values(categoryKeywords)
    .flat()
    .map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'i',
);

function normalize(value) {
  return cleanOcrText(value)
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/5/g, 's')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(value) {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .replace(/\bAnd\b/g, 'and');
}

function parseAliases(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function cleanOcrText(value) {
  const corrected = corrections.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    String(value || ''),
  );

  return corrected
    .replace(/[|_*~`]+/g, ' ')
    .replace(/[^\w&.'₹,\- \n]+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function detectCategory(name, mappings = []) {
  const normalizedName = normalize(name);
  const mapping = mappings.find((entry) => {
    const aliases = parseAliases(entry.aliases);
    return [entry.itemName, ...aliases].some((candidate) => normalize(candidate) === normalizedName);
  });

  if (mapping?.category && mapping.category !== 'unknown') return mapping.category;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => normalizedName.includes(keyword))) return category;
  }

  return 'shared';
}

function extractQuantity(rawName) {
  let name = rawName.trim();
  let quantity = null;

  const leadingQuantity = name.match(/^(\d{1,2})\s*[xX]\s+(.+)$/);
  if (leadingQuantity) {
    quantity = Number(leadingQuantity[1]);
    name = leadingQuantity[2].trim();
  }

  const leadingPlainQuantity = name.match(/^(\d{1,2})\s+([a-z].+)$/i);
  if (!quantity && leadingPlainQuantity) {
    quantity = Number(leadingPlainQuantity[1]);
    name = leadingPlainQuantity[2].trim();
  }

  const trailingQuantity = name.match(/^(.+?)\s+[xX]\s*(\d{1,2})$/);
  if (trailingQuantity) {
    quantity = Number(trailingQuantity[2]);
    name = trailingQuantity[1].trim();
  }

  const compactQuantity = name.match(/^(.+?)\s+(\d{1,2})$/);
  if (!quantity && compactQuantity) {
    quantity = Number(compactQuantity[2]);
    name = compactQuantity[1].trim();
  }

  if (!quantity) {
    name = name.replace(/^\d{1,2}[.)-]?\s+/, '').trim();
  }

  return {
    name: toTitleCase(stripHeaderTokens(cleanOcrText(name).replace(/^[^a-z0-9]+/i, '').trim())),
    quantity,
  };
}

function stripHeaderTokens(value) {
  let nextValue = value.trim();
  let previousValue = '';

  while (nextValue && nextValue !== previousValue) {
    previousValue = nextValue;
    nextValue = nextValue.replace(itemHeaderTokenPattern, '').trim();
  }

  return nextValue;
}

function isReceiptNoiseLine(line) {
  const normalizedLine = normalize(line);
  if (!normalizedLine) return true;
  if (footerPattern.test(line) || metadataPattern.test(line)) return true;
  if (/^\d+([\s:/.-]\d+)+$/.test(line.trim())) return true;
  if (/^\s*(thank|visit|welcome|tax invoice|restaurant|powered by)\b/i.test(line)) return true;
  return false;
}

function isLikelyMenuItemName(name) {
  const normalizedName = normalize(name);
  const words = normalizedName.split(' ').filter(Boolean);

  if (words.length === 0 || normalizedName.length < 3) return false;
  if (isReceiptNoiseLine(name)) return false;
  if (/\b\d{1,2}\s*[:/-]\s*\d{1,2}\b/.test(name)) return false;
  if (/\b\d{4}\b/.test(name)) return false;
  if (/\b(hotel|restaurant|cafe|bar|diner|kitchen|invoice|receipt|bill|date|time|table|subtotal|total|gst|tax)\b/i.test(normalizedName)) {
    return false;
  }
  if (!/[a-z]/i.test(name)) return false;

  return words.length >= 2 || menuKeywordPattern.test(normalizedName);
}

function itemSectionLines(cleaned) {
  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const headerIndex = lines.findIndex((line) => headerPattern.test(line));
  const candidateLines = headerIndex >= 0 ? lines.slice(headerIndex + 1) : lines;
  const sectionLines = [];

  for (const line of candidateLines) {
    if (footerPattern.test(line)) break;
    if (!isReceiptNoiseLine(line)) sectionLines.push(line);
  }

  return sectionLines;
}

function trimNumericColumns(value) {
  return value
    .replace(/(?:\s+(?:rs\.?|inr|₹)?\s*[0-9][0-9,]{1,8}(?:\.[0-9]{1,2})?){1,3}$/i, '')
    .trim();
}

function shouldUseLastAmountInRow(chunk, matches) {
  if (matches.length < 2) return false;

  const firstMatch = matches[0];
  const lastMatch = matches[matches.length - 1];
  const textBetweenAmounts = chunk.slice(
    firstMatch.index + firstMatch[0].length,
    lastMatch.index,
  );

  return !/[a-z]/i.test(textBetweenAmounts);
}

function buildParsedItem(chunk, match, previousEnd, mappings, useTrimmedNumericColumns = false) {
  const rawText = chunk.slice(previousEnd, match.index).replace(/(?:rs\.?|inr|₹)\s*$/i, '').trim();
  const rawName = useTrimmedNumericColumns ? trimNumericColumns(rawText) : rawText;
  const amount = Number(match[1].replace(/,/g, ''));
  const { name, quantity } = extractQuantity(rawName);

  if (!isLikelyMenuItemName(name) || !Number.isFinite(amount) || amount <= 0) return null;

  return {
    id: createLocalId('ocr-row'),
    name,
    amount: amount.toFixed(2),
    price: amount,
    quantity,
    category: detectCategory(name, mappings),
    confidence: null,
    matchType: 'ocr',
  };
}

function parseTextChunk(chunk, mappings) {
  if (isReceiptNoiseLine(chunk)) return [];

  const matches = [...chunk.matchAll(amountPattern)];
  if (matches.length === 0) return [];

  if (shouldUseLastAmountInRow(chunk, matches)) {
    const lastMatch = matches[matches.length - 1];
    const item = buildParsedItem(chunk, lastMatch, 0, mappings, true);
    return item ? [item] : [];
  }

  return matches
    .map((match, index) => {
      const previousEnd = index === 0 ? 0 : matches[index - 1].index + matches[index - 1][0].length;
      return buildParsedItem(chunk, match, previousEnd, mappings);
    })
    .filter(Boolean);
}

export function parseReceiptText(text, mappings = []) {
  const cleaned = cleanOcrText(text);
  const lines = itemSectionLines(cleaned);
  const parsedByLine = lines.flatMap((line) => parseTextChunk(line, mappings));

  if (parsedByLine.length > 0) return parsedByLine;

  const headerMatch = cleaned.match(headerPattern);
  const focusedText = headerMatch
    ? cleaned.slice((headerMatch.index || 0) + headerMatch[0].length)
    : cleaned;
  const beforeTotals = focusedText.split(/\b(?:sub\s*total|subtotal|grand\s*total|total|net\s*amount|amount\s*payable)\b/i)[0];

  return parseTextChunk(beforeTotals.replace(/\n/g, ' '), mappings);
}

export function mergeClassifications(items, classifications = []) {
  const byName = new Map(classifications.map((entry) => [normalize(entry.name), entry]));

  return items.map((item) => {
    const classification = byName.get(normalize(item.name));
    if (!classification) return item;

    return {
      ...item,
      category: classification.category === 'unknown' ? 'shared' : classification.category,
      detectedCategory: classification.category,
      confidence: classification.confidence,
      matchType: classification.matchType,
      matchedItem: classification.matchedItem,
      normalizedName: classification.normalizedName,
    };
  });
}

export async function preprocessReceiptImage(file) {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 1600;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext('2d');
  context.filter = 'grayscale(1) contrast(1.35) brightness(1.05)';
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  return canvas.toDataURL('image/png');
}

export async function recognizeReceipt(file, onProgress = () => {}) {
  onProgress({ status: 'preprocessing', progress: 0.05 });
  const image = await preprocessReceiptImage(file);
  const worker = await createWorker('eng', 1, {
    logger: (event) => onProgress(event),
  });

  try {
    await worker.setParameters({
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: '6',
    });
    const result = await worker.recognize(image);
    return result.data.text;
  } finally {
    await worker.terminate();
  }
}

export function loadOcrHistory() {
  try {
    return JSON.parse(localStorage.getItem('quickSplit.ocrHistory') || '[]');
  } catch {
    return [];
  }
}

export function saveOcrHistory(entry) {
  const history = loadOcrHistory();
  const nextHistory = [entry, ...history].slice(0, 10);
  localStorage.setItem('quickSplit.ocrHistory', JSON.stringify(nextHistory));
  return nextHistory;
}

export function loadOcrDraft(sessionId) {
  if (!sessionId) return { rows: [], rawText: '' };

  try {
    const draft = JSON.parse(localStorage.getItem(`quickSplit.ocrDraft.${sessionId}`) || '{}');
    return {
      rows: Array.isArray(draft.rows) ? draft.rows : [],
      rawText: typeof draft.rawText === 'string' ? draft.rawText : '',
    };
  } catch {
    return { rows: [], rawText: '' };
  }
}

export function saveOcrDraft(sessionId, draft) {
  if (!sessionId) return;

  localStorage.setItem(
    `quickSplit.ocrDraft.${sessionId}`,
    JSON.stringify({
      rows: Array.isArray(draft.rows) ? draft.rows : [],
      rawText: draft.rawText || '',
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function clearOcrDraft(sessionId) {
  if (!sessionId) return;
  localStorage.removeItem(`quickSplit.ocrDraft.${sessionId}`);
}
