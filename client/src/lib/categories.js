export const categories = [
  { id: 'veg', label: 'Veg' },
  { id: 'nonveg', label: 'Non-veg' },
  { id: 'drink', label: 'Drink' },
  { id: 'dessert', label: 'Dessert' },
  { id: 'alcohol', label: 'Alcohol' },
  { id: 'shared', label: 'Shared' },
];

export const assignableCategories = categories.map((category) => category.id);
export const classifiableCategories = ['veg', 'nonveg', 'drink', 'dessert', 'alcohol', 'unknown'];

const categoryAliases = {
  non_veg: 'nonveg',
  nonVeg: 'nonveg',
  drinks: 'drink',
};

export const participantPreferences = [
  { key: 'isVeg', label: 'Veg' },
  { key: 'isNonVeg', label: 'Non-veg' },
  { key: 'drinks', label: 'Drinks' },
  { key: 'dessert', label: 'Dessert' },
  { key: 'alcohol', label: 'Alcohol' },
];

export const categoryLabels = Object.fromEntries(
  categories.map((category) => [category.id, category.label]),
);

export function normalizeCategory(category, fallback = 'unknown') {
  return categoryAliases[category] || category || fallback;
}

export function categoryLabel(category) {
  return categoryLabels[normalizeCategory(category, category)] || category;
}
