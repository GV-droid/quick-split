import { categoryLabel, normalizeCategory } from '../lib/categories.js';

const styles = {
  veg: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  nonveg: 'bg-rose-100 text-rose-800 ring-rose-200',
  drink: 'bg-amber-100 text-amber-800 ring-amber-200',
  dessert: 'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200',
  alcohol: 'bg-violet-100 text-violet-800 ring-violet-200',
  shared: 'bg-sky-100 text-sky-800 ring-sky-200',
  unknown: 'bg-stone-100 text-stone-700 ring-stone-200',
};

export default function CategoryBadge({ category }) {
  const normalized = normalizeCategory(category, 'unknown');

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${styles[normalized] || styles.unknown}`}
    >
      {categoryLabel(normalized)}
    </span>
  );
}
