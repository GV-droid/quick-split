import { Edit3, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import CategoryBadge from './CategoryBadge.jsx';

export default function ItemCard({ item, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: item.name,
    amount: item.amount,
    category: item.category,
  });

  function cancelEdit() {
    setDraft({ name: item.name, amount: item.amount, category: item.category });
    setIsEditing(false);
  }

  async function submitEdit(event) {
    event.preventDefault();
    await onUpdate(item.id, { ...draft, amount: Number(draft.amount) });
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <form onSubmit={submitEdit}>
          <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              className="rounded-md border border-stone-300 px-3 py-2"
              aria-label="Item name"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.amount}
              onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
              className="rounded-md border border-stone-300 px-3 py-2"
              aria-label="Item amount"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {['veg', 'nonveg', 'drink', 'shared'].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setDraft({ ...draft, category })}
                className={`rounded-md border px-3 py-2 ${
                  draft.category === category
                    ? 'border-ink bg-ink text-white'
                    : 'border-stone-200 bg-stone-50'
                }`}
              >
                <CategoryBadge category={category} />
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white"
            >
              <Save size={16} />
              Save
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{item.name}</h3>
            <CategoryBadge category={item.category} />
          </div>
          <p className="mt-2 text-xl font-bold">₹{Number(item.amount).toFixed(2)}</p>
        </div>
        <div className="flex">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-ink"
            aria-label={`Edit ${item.name}`}
          >
            <Edit3 size={18} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-rose-700"
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
