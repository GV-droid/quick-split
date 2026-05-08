const styles = {
  veg: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  nonveg: 'bg-rose-100 text-rose-800 ring-rose-200',
  drink: 'bg-amber-100 text-amber-800 ring-amber-200',
  shared: 'bg-sky-100 text-sky-800 ring-sky-200',
};

const labels = {
  veg: 'Veg',
  nonveg: 'Non-veg',
  drink: 'Drink',
  shared: 'Shared',
};

export default function CategoryBadge({ category }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${styles[category] || styles.shared}`}
    >
      {labels[category] || category}
    </span>
  );
}
