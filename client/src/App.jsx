import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, ReceiptText, Trash2, Users } from 'lucide-react';
import { api } from './lib/api.js';
import CategoryBadge from './components/CategoryBadge.jsx';
import ExpenseBreakdownTable from './components/ExpenseBreakdownTable.jsx';
import ItemCard from './components/ItemCard.jsx';
import OcrReviewPanel from './components/OcrReviewPanel.jsx';
import ParticipantCard from './components/ParticipantCard.jsx';
import SplitSummaryCard from './components/SplitSummaryCard.jsx';
import { assignableCategories, participantPreferences } from './lib/categories.js';

const emptyParticipant = {
  name: '',
  isVeg: true,
  isNonVeg: false,
  drinks: false,
  dessert: false,
  alcohol: false,
};
const emptyItem = { name: '', amount: '', category: 'shared' };
const emptyCharges = { tax: 0, serviceCharge: 0, tip: 0 };

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);
  const [title, setTitle] = useState('');
  const [participant, setParticipant] = useState(emptyParticipant);
  const [item, setItem] = useState(emptyItem);
  const [charges, setCharges] = useState(emptyCharges);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isBillsOpen, setIsBillsOpen] = useState(true);

  const sessionId = session?.id;

  async function loadSessions() {
    const data = await api.getSessions();
    setSessions(data.sessions);
    return data.sessions;
  }

  async function loadSession(id = sessionId) {
    if (!id) return;
    const [detail, split] = await Promise.all([api.getSession(id), api.getSummary(id)]);
    setSession(detail.session);
    setCharges(detail.session.charges || emptyCharges);
    setSummary(split.summary);
  }

  async function guarded(action) {
    try {
      setError('');
      await action();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    guarded(async () => {
      setLoading(true);
      const existing = await loadSessions();
      const first = existing[0];
      if (first) await loadSession(first.id);
      setLoading(false);
    });
  }, []);

  const totals = useMemo(() => {
    if (!summary) return { items: 0, participants: 0 };
    return {
      items: session?.items?.length || 0,
      participants: session?.participants?.length || 0,
    };
  }, [summary, session]);

  async function createSession(event) {
    event.preventDefault();
    await guarded(async () => {
      const created = await api.createSession(title);
      setTitle('');
      await loadSessions();
      await loadSession(created.session.id);
    });
  }

  async function deleteBill(id) {
    await guarded(async () => {
      await api.deleteSession(id);
      const remaining = await loadSessions();
      if (sessionId === id) {
        const nextBill = remaining.find((entry) => entry.id !== id);
        if (nextBill) {
          await loadSession(nextBill.id);
        } else {
          setSession(null);
          setSummary(null);
          setCharges(emptyCharges);
        }
      }
    });
  }

  async function addParticipant(event) {
    event.preventDefault();
    await guarded(async () => {
      await api.addParticipant(sessionId, participant);
      setParticipant(emptyParticipant);
      await loadSession();
    });
  }

  async function addItem(event) {
    event.preventDefault();
    await guarded(async () => {
      await api.addItem(sessionId, { ...item, amount: Number(item.amount) });
      setItem(emptyItem);
      await loadSession();
    });
  }

  async function importOcrItems(reviewItems) {
    try {
      setError('');
      const existingKeys = new Set(
        (session?.items || []).map(
          (existingItem) =>
            `${existingItem.name.trim().toLowerCase()}|${Number(existingItem.amount || 0).toFixed(2)}|${existingItem.category}`,
        ),
      );
      const seenKeys = new Set();

      for (const reviewItem of reviewItems) {
        const key = `${reviewItem.name.trim().toLowerCase()}|${Number(reviewItem.amount || 0).toFixed(2)}|${reviewItem.category}`;
        if (existingKeys.has(key) || seenKeys.has(key)) continue;
        seenKeys.add(key);
        await api.addItem(sessionId, reviewItem);
      }
      await loadSession();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function saveCharges(event) {
    event.preventDefault();
    await guarded(async () => {
      await api.updateCharges(sessionId, {
        tax: Number(charges.tax || 0),
        serviceCharge: Number(charges.serviceCharge || 0),
        tip: Number(charges.tip || 0),
      });
      await loadSession();
    });
  }

  if (loading) {
    return <main className="min-h-screen p-6 text-center">Loading Quick Split...</main>;
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-tomato">
              Quick Split
            </p>
            <h1 className="text-3xl font-black">One bill. One clean split.</h1>
          </div>
          <form onSubmit={createSession} className="flex gap-2 sm:w-auto">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Bill title"
              className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2 sm:w-44 sm:flex-none"
            />
            <button className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 font-semibold text-white">
              <Plus size={18} />
              Create
            </button>
          </form>
        </div>
      </header>

      <div
        className={`mx-auto grid max-w-6xl gap-5 px-4 py-5 ${
          isBillsOpen ? 'lg:grid-cols-[240px_1fr]' : 'lg:grid-cols-[56px_1fr]'
        }`}
      >
        <aside className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            {isBillsOpen && (
              <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
                Bills
              </h2>
            )}
            <button
              type="button"
              onClick={() => setIsBillsOpen(!isBillsOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-100"
              aria-label={isBillsOpen ? 'Collapse bills menu' : 'Expand bills menu'}
            >
              {isBillsOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          {isBillsOpen ? (
            sessions.map((entry) => (
              <div
                key={entry.id}
                className={`group flex items-start gap-2 rounded-lg border p-3 ${
                  sessionId === entry.id
                    ? 'border-stone-400 bg-stone-500 text-white'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => guarded(() => loadSession(entry.id))}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate font-semibold">{entry.title}</span>
                  <span className="mt-1 block text-xs opacity-70">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteBill(entry.id)}
                  className={`rounded-md p-1.5 ${
                    sessionId === entry.id
                      ? 'text-white/80 hover:bg-white/10 hover:text-white'
                      : 'text-stone-400 hover:bg-rose-50 hover:text-rose-700'
                  }`}
                  aria-label={`Delete ${entry.title}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="space-y-2">
              {sessions.map((entry) => (
                <div key={entry.id} className="space-y-1">
                  <button
                    onClick={() => guarded(() => loadSession(entry.id))}
                    title={entry.title}
                    className={`flex h-10 w-10 items-center justify-center rounded-md border text-sm font-bold ${
                      sessionId === entry.id
                        ? 'border-stone-400 bg-stone-500 text-white'
                        : 'border-stone-200 bg-white text-stone-600'
                    }`}
                  >
                    {entry.title.trim().slice(0, 1).toUpperCase() || 'B'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBill(entry.id)}
                    className="flex h-8 w-10 items-center justify-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-700"
                    aria-label={`Delete ${entry.title}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        {session ? (
          <section className="space-y-5">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <Users className="text-tomato" />
                <p className="mt-3 text-2xl font-black">{totals.participants}</p>
                <p className="text-sm text-stone-500">Participants</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <ReceiptText className="text-emerald-600" />
                <p className="mt-3 text-2xl font-black">{totals.items}</p>
                <p className="text-sm text-stone-500">Bill items</p>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="space-y-3">
                <h2 className="text-xl font-black">Participants</h2>
                <form onSubmit={addParticipant} className="rounded-lg bg-white p-4 shadow-sm">
                  <input
                    value={participant.name}
                    onChange={(event) =>
                      setParticipant({ ...participant, name: event.target.value })
                    }
                    placeholder="Name"
                    className="w-full rounded-md border border-stone-300 px-3 py-2"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    {participantPreferences.map(({ key, label }) => (
                      <label key={key} className="rounded-md bg-stone-100 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={participant[key]}
                          onChange={(event) =>
                            setParticipant({ ...participant, [key]: event.target.checked })
                          }
                          className="mr-2"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <button className="mt-3 w-full rounded-md bg-stone-500 px-4 py-2 font-semibold text-white">
                    Add participant
                  </button>
                </form>
                <div className="grid gap-3 sm:grid-cols-2">
                  {session.participants.map((person) => (
                    <ParticipantCard
                      key={person.id}
                      participant={person}
                      onDelete={(id) =>
                        guarded(async () => {
                          await api.deleteParticipant(sessionId, id);
                          await loadSession();
                        })
                      }
                      onUpdate={(id, nextParticipant) =>
                        guarded(async () => {
                          await api.updateParticipant(sessionId, id, nextParticipant);
                          await loadSession();
                        })
                      }
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-black">Bill Items</h2>
                <form onSubmit={addItem} className="rounded-lg bg-white p-4 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                    <input
                      value={item.name}
                      onChange={(event) => setItem({ ...item, name: event.target.value })}
                      placeholder="Item name"
                      className="rounded-md border border-stone-300 px-3 py-2"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.amount}
                      onChange={(event) =>
                        setItem({ ...item, amount: event.target.value })
                      }
                      placeholder="Amount"
                      className="rounded-md border border-stone-300 px-3 py-2"
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {assignableCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setItem({ ...item, category })}
                        className={`rounded-md border px-3 py-2 ${
                          item.category === category
                            ? 'border-stone-400 bg-stone-500 text-white'
                            : 'border-stone-200 bg-stone-50'
                        }`}
                      >
                        <CategoryBadge category={category} />
                      </button>
                    ))}
                  </div>
                  <button className="mt-3 w-full rounded-md bg-stone-500 px-4 py-2 font-semibold text-white">
                    Add item
                  </button>
                </form>
                <OcrReviewPanel
                  sessionId={sessionId}
                  participants={session.participants}
                  existingItems={session.items}
                  onImport={importOcrItems}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {session.items.map((billItem) => (
                    <ItemCard
                      key={billItem.id}
                      item={billItem}
                      participants={session.participants}
                      onDelete={(id) =>
                        guarded(async () => {
                          await api.deleteItem(sessionId, id);
                          await loadSession();
                        })
                      }
                      onUpdate={(id, nextItem) =>
                        guarded(async () => {
                          await api.updateItem(sessionId, id, nextItem);
                          await loadSession();
                        })
                      }
                    />
                  ))}
                </div>
              </section>
            </div>

            <section className="space-y-5">
              <form
                onSubmit={saveCharges}
                className="rounded-lg bg-white p-4 shadow-sm"
              >
                <div className="grid gap-3 lg:grid-cols-[150px_repeat(3,minmax(0,1fr))_140px] lg:items-end">
                  <h2 className="text-xl font-black lg:pb-2">Tax & Tips</h2>
                  {[
                    ['tax', 'Tax'],
                    ['serviceCharge', 'Service charge'],
                    ['tip', 'Tip'],
                  ].map(([key, label]) => (
                    <label key={key} className="block text-sm font-semibold">
                      {label}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={charges[key]}
                        onChange={(event) =>
                          setCharges({ ...charges, [key]: event.target.value })
                        }
                        className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                      />
                    </label>
                  ))}
                  <button className="rounded-md bg-stone-500 px-4 py-2 font-semibold text-white">
                    Save extras
                  </button>
                </div>
              </form>

              {summary && (
                <div className="space-y-4">
                  <SplitSummaryCard summary={summary} />
                  {summary.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      {summary.warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  )}
                  <ExpenseBreakdownTable rows={summary.participants} />
                </div>
              )}
            </section>
          </section>
        ) : (
          <section className="rounded-lg bg-white p-8 text-center shadow-sm">
            Create a bill to start splitting.
          </section>
        )}
      </div>
    </main>
  );
}
