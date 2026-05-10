import { assignableCategories, categoryLabel } from '../lib/categories.js';

export default function ExpenseBreakdownTable({ rows }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-stone-100 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Participant</th>
            {assignableCategories.map((category) => (
              <th key={category} className="px-4 py-3">
                {categoryLabel(category)}
              </th>
            ))}
            <th className="px-4 py-3">Extras</th>
            <th className="px-4 py-3 text-right">Payable</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row) => (
            <tr key={row.participantId}>
              <td className="px-4 py-3 font-semibold">{row.name}</td>
              {assignableCategories.map((category) => (
                <td key={category} className="px-4 py-3">
                  ₹{Number(row.categories[category] || 0).toFixed(2)}
                </td>
              ))}
              <td className="px-4 py-3">₹{row.extraCharges.toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-base font-bold">
                ₹{row.total.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
