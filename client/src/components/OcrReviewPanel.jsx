import { Camera, GalleryHorizontalEnd, Plus, ReceiptText, ScanLine, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { assignableCategories, categoryLabel } from '../lib/categories.js';
import { createLocalId } from '../lib/id.js';
import {
  loadOcrHistory,
  loadOcrDraft,
  mergeClassifications,
  parseReceiptText,
  recognizeReceipt,
  clearOcrDraft,
  saveOcrDraft,
  saveOcrHistory,
} from '../lib/ocr.js';
import CategoryBadge from './CategoryBadge.jsx';

const emptyReviewItem = {
  id: '',
  name: '',
  amount: '',
  quantity: null,
  category: 'shared',
  confidence: null,
};

function suggestedParticipants(category, participants) {
  if (category === 'veg') return participants.filter((participant) => participant.isVeg);
  if (category === 'nonveg') return participants.filter((participant) => participant.isNonVeg);
  if (category === 'drink') return participants.filter((participant) => participant.drinks);
  if (category === 'dessert') return participants.filter((participant) => participant.dessert);
  if (category === 'alcohol') return participants.filter((participant) => participant.alcohol);
  return participants;
}

function confidenceLabel(value) {
  if (value === null || value === undefined) return 'OCR';
  return `${Math.round(value * 100)}%`;
}

function itemKey(item) {
  return `${String(item.name || '').trim().toLowerCase()}|${Number(item.amount || 0).toFixed(2)}|${item.category}`;
}

export default function OcrReviewPanel({ sessionId, participants, existingItems = [], onImport }) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const skipNextDraftSaveRef = useRef(true);
  const [rows, setRows] = useState([]);
  const [rawText, setRawText] = useState('');
  const [progress, setProgress] = useState(null);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(() => loadOcrHistory());

  const hasRows = rows.length > 0;
  const existingItemKeys = useMemo(() => new Set(existingItems.map(itemKey)), [existingItems]);
  const duplicateReviewKeys = useMemo(() => {
    const seen = new Set();
    const duplicates = new Set();

    rows.forEach((row) => {
      const key = itemKey(row);
      if (seen.has(key)) duplicates.add(key);
      seen.add(key);
    });

    return duplicates;
  }, [rows]);
  const importableRows = useMemo(() => {
    const seen = new Set();

    return rows.filter((row) => {
      const key = itemKey(row);
      const isValid =
        row.name.trim() && Number.isFinite(Number(row.amount)) && Number(row.amount) > 0;
      const isDuplicate = existingItemKeys.has(key) || seen.has(key);
      seen.add(key);
      return isValid && !isDuplicate;
    });
  }, [existingItemKeys, rows]);

  useEffect(() => {
    const draft = loadOcrDraft(sessionId);
    skipNextDraftSaveRef.current = true;
    setRows(draft.rows);
    setRawText(draft.rawText);
  }, [sessionId]);

  useEffect(() => {
    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      return;
    }

    saveOcrDraft(sessionId, { rows, rawText });
  }, [sessionId, rows, rawText]);

  async function classifyRows(nextRows) {
    if (nextRows.length === 0) return [];
    const { classifications } = await api.classifyMenuItems(nextRows.map((row) => row.name));
    return mergeClassifications(nextRows, classifications);
  }

  async function handleFile(file) {
    if (!file) return;

    try {
      setError('');
      setIsReading(true);
      setProgress({ status: 'starting', progress: 0 });
      const text = await recognizeReceipt(file, (event) => {
        setProgress({
          status: event.status || 'reading',
          progress: Math.max(event.progress || 0, 0.05),
        });
      });
      const parsedRows = parseReceiptText(text);
      const classifiedRows = await classifyRows(parsedRows);
      setRawText(text);
      setRows(classifiedRows);
      setHistory(
        saveOcrHistory({
          id: createLocalId('ocr-history'),
          createdAt: new Date().toISOString(),
          fileName: file.name || 'Camera upload',
          itemCount: classifiedRows.length,
          rawText: text,
        }),
      );
    } catch (err) {
      setError(err.message || 'Could not read the receipt image.');
    } finally {
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      setIsReading(false);
      setProgress(null);
    }
  }

  async function updateRow(id, patch) {
    const nextRows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
    setRows(nextRows);

    if (patch.category && patch.name) {
      try {
        await api.saveMenuMapping(patch.name, { category: patch.category, aliases: [] });
      } catch (err) {
        setError(err.message);
      }
    }
  }

  async function reclassifyRow(id) {
    const row = rows.find((entry) => entry.id === id);
    if (!row?.name.trim()) return;
    try {
      const [classified] = await classifyRows([row]);
      setRows(rows.map((entry) => (entry.id === id ? { ...entry, ...classified } : entry)));
    } catch (err) {
      setError(err.message);
    }
  }

  function addRow() {
    setRows([
      ...rows,
      {
        ...emptyReviewItem,
        id: createLocalId('ocr-row'),
      },
    ]);
  }

  async function importRows() {
    await onImport(
      importableRows.map((row) => ({
        name: row.name.trim(),
        amount: Number(row.amount),
        category: row.category,
      })),
    );
    setRows([]);
    setRawText('');
    clearOcrDraft(sessionId);
  }

  return (
    <section className="rounded-lg bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black">Scan receipt</h3>
          <p className="text-sm text-stone-500">Import OCR rows only after reviewing them.</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-stone-500 px-3 py-2 text-sm font-semibold text-white sm:flex-none"
          >
            <Camera size={17} />
            Camera
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold sm:flex-none"
          >
            <GalleryHorizontalEnd size={17} />
            Gallery
          </button>
        </div>
      </div>

      {isReading && (
        <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-700">
            <ScanLine size={17} />
            {progress?.status || 'Reading receipt'}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full bg-tomato transition-all"
              style={{ width: `${Math.round((progress?.progress || 0.1) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {hasRows && (
        <div className="mt-4 space-y-3">
          {rows.map((row) => {
            const suggested = suggestedParticipants(row.category, participants);
            const duplicateLabel = existingItemKeys.has(itemKey(row))
              ? 'Already in bill'
              : duplicateReviewKeys.has(itemKey(row))
                ? 'Duplicate OCR row'
                : '';

            return (
              <article key={row.id} className="rounded-lg border border-stone-200 p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_110px]">
                  <input
                    value={row.name}
                    onChange={(event) => updateRow(row.id, { name: event.target.value })}
                    onBlur={() => reclassifyRow(row.id)}
                    placeholder="Item name"
                    className="min-h-11 rounded-md border border-stone-300 px-3 py-2"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.amount}
                    onChange={(event) => updateRow(row.id, { amount: event.target.value })}
                    placeholder="Price"
                    className="min-h-11 rounded-md border border-stone-300 px-3 py-2"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {assignableCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => updateRow(row.id, { category, name: row.name })}
                      className={`min-h-11 rounded-md border px-3 py-2 ${
                        row.category === category
                          ? 'border-stone-400 bg-stone-500 text-white'
                          : 'border-stone-200 bg-stone-50'
                      }`}
                    >
                      {categoryLabel(category)}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <CategoryBadge category={row.detectedCategory || row.category} />
                  <span>Confidence {confidenceLabel(row.confidence)}</span>
                  {row.quantity ? <span>Qty {row.quantity}</span> : null}
                  {duplicateLabel ? (
                    <span className="font-semibold text-amber-700">{duplicateLabel}</span>
                  ) : null}
                  {suggested.length > 0 ? (
                    <span>Eligible {suggested.map((person) => person.name).join(', ')}</span>
                  ) : (
                    <span>No matching participants</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setRows(rows.filter((entry) => entry.id !== row.id))}
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 size={16} />
                  Delete row
                </button>
              </article>
            );
          })}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 py-2 font-semibold"
            >
              <Plus size={17} />
              Add missing row
            </button>
            <button
              type="button"
              onClick={importRows}
              disabled={importableRows.length === 0}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-tomato px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              <ReceiptText size={17} />
              Import {importableRows.length} items
            </button>
          </div>
        </div>
      )}

      {!hasRows && history.length > 0 && (
        <div className="mt-4 border-t border-stone-100 pt-3">
          <h4 className="text-sm font-bold text-stone-600">Recent OCR</h4>
          <div className="mt-2 space-y-2 text-sm text-stone-500">
            {history.slice(0, 3).map((entry) => (
              <p key={entry.id}>
                {entry.fileName} · {entry.itemCount} items ·{' '}
                {new Date(entry.createdAt).toLocaleDateString()}
              </p>
            ))}
          </div>
        </div>
      )}

      {rawText && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold text-stone-600">OCR text</summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-stone-100 p-3 text-xs">
            {rawText}
          </pre>
        </details>
      )}
    </section>
  );
}
