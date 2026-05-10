import { customMenuMappings, menuItems } from '../db/schema.js';

const LOW_CONFIDENCE = 0.68;

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
];

const keywordFallbacks = {
  veg: ['paneer', 'dal', 'gobi', 'aloo', 'veg', 'mushroom', 'chole', 'idli', 'dosa'],
  nonveg: ['chicken', 'mutton', 'fish', 'prawn', 'egg', 'kebab', 'meat'],
  drink: ['coke', 'pepsi', 'sprite', 'juice', 'tea', 'coffee', 'lassi', 'soda', 'water'],
  dessert: ['brownie', 'cake', 'ice cream', 'kulfi', 'gulab', 'jamun', 'rasmalai'],
  alcohol: ['beer', 'wine', 'whisky', 'vodka', 'rum', 'gin', 'tequila', 'cocktail'],
};

export function cleanMenuText(value) {
  const corrected = corrections.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    String(value || ''),
  );

  return corrected
    .replace(/[|_*~`]+/g, ' ')
    .replace(/[^\w&.'\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeMenuText(value) {
  return cleanMenuText(value)
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/5/g, 's')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAliases(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, index) => [index]);
  for (let index = 1; index <= b.length; index += 1) matrix[0][index] = index;

  for (let row = 1; row <= a.length; row += 1) {
    for (let col = 1; col <= b.length; col += 1) {
      matrix[row][col] =
        a[row - 1] === b[col - 1]
          ? matrix[row - 1][col - 1]
          : Math.min(matrix[row - 1][col - 1] + 1, matrix[row][col - 1] + 1, matrix[row - 1][col] + 1);
    }
  }

  return matrix[a.length][b.length];
}

function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function candidatesFor(row) {
  return [row.itemName, ...parseAliases(row.aliases)].map((candidate) => ({
    raw: candidate,
    normalized: normalizeMenuText(candidate),
  }));
}

function scoreCandidate(input, candidate) {
  if (!input || !candidate.normalized) return 0;
  if (candidate.normalized === input) return 1;
  if (candidate.normalized.includes(input) || input.includes(candidate.normalized)) {
    const shortest = Math.min(input.length, candidate.normalized.length);
    const longest = Math.max(input.length, candidate.normalized.length);
    return Math.max(0.76, shortest / longest);
  }
  return similarity(input, candidate.normalized) * 0.95;
}

function keywordMatch(normalized) {
  for (const [category, keywords] of Object.entries(keywordFallbacks)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return { category, confidence: 0.72, matchType: 'keyword' };
    }
  }
  return null;
}

function classifyFromRows(rows, itemName) {
  const normalized = normalizeMenuText(itemName);

  let best = null;
  for (const row of rows) {
    for (const candidate of candidatesFor(row)) {
      const score = scoreCandidate(normalized, candidate);
      if (!best || score > best.confidence) {
        best = {
          category: row.category,
          confidence: score,
          matchType: score === 1 ? 'exact' : candidate.normalized.includes(normalized) || normalized.includes(candidate.normalized) ? 'partial' : 'fuzzy',
          matchedItem: row.itemName,
          normalizedName: normalized,
        };
      }
    }
  }

  const keyword = keywordMatch(normalized);
  if ((!best || keyword?.confidence > best.confidence) && keyword) {
    best = { ...keyword, matchedItem: null, normalizedName: normalized };
  }

  if (!best || best.confidence < LOW_CONFIDENCE || best.category === 'unknown') {
    return {
      category: 'unknown',
      confidence: best?.confidence || 0,
      matchType: best?.matchType || 'none',
      matchedItem: best?.matchedItem || null,
      normalizedName: normalized,
    };
  }

  return {
    ...best,
    confidence: Math.round(best.confidence * 100) / 100,
  };
}

export async function classifyMenuItem(db, itemName) {
  const [customRows, defaultRows] = await Promise.all([
    db.select().from(customMenuMappings),
    db.select().from(menuItems),
  ]);
  return classifyFromRows([...customRows, ...defaultRows], itemName);
}

export async function classifyMenuItems(db, names) {
  const [customRows, defaultRows] = await Promise.all([
    db.select().from(customMenuMappings),
    db.select().from(menuItems),
  ]);
  const rows = [...customRows, ...defaultRows];

  return names.map((name) => ({
    name,
    ...classifyFromRows(rows, name),
  }));
}
