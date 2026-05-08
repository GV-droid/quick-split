import { Coffee, Edit3, Leaf, Save, Trash2, Utensils, X } from 'lucide-react';
import { useState } from 'react';

export default function ParticipantCard({ participant, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: participant.name,
    isVeg: participant.isVeg,
    isNonVeg: participant.isNonVeg,
    drinks: participant.drinks,
  });

  const prefs = [
    { enabled: participant.isVeg, label: 'Veg', icon: Leaf },
    { enabled: participant.isNonVeg, label: 'Non-veg', icon: Utensils },
    { enabled: participant.drinks, label: 'Drinks', icon: Coffee },
  ];

  function cancelEdit() {
    setDraft({
      name: participant.name,
      isVeg: participant.isVeg,
      isNonVeg: participant.isNonVeg,
      drinks: participant.drinks,
    });
    setIsEditing(false);
  }

  async function submitEdit(event) {
    event.preventDefault();
    await onUpdate(participant.id, draft);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <form onSubmit={submitEdit}>
          <input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            className="w-full rounded-md border border-stone-300 px-3 py-2"
            aria-label="Participant name"
          />
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            {[
              ['isVeg', 'Veg'],
              ['isNonVeg', 'Non-veg'],
              ['drinks', 'Drinks'],
            ].map(([key, label]) => (
              <label key={key} className="rounded-md bg-stone-100 px-3 py-2">
                <input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(event) => setDraft({ ...draft, [key]: event.target.checked })}
                  className="mr-2"
                />
                {label}
              </label>
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
          <h3 className="text-base font-semibold">{participant.name}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {prefs.map(({ enabled, label, icon: Icon }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  enabled
                    ? 'bg-ink text-white'
                    : 'bg-stone-100 text-stone-400 line-through'
                }`}
              >
                <Icon size={13} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-ink"
            aria-label={`Edit ${participant.name}`}
          >
            <Edit3 size={18} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(participant.id)}
            className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-rose-700"
            aria-label={`Remove ${participant.name}`}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
