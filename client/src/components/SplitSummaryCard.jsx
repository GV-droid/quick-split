export default function SplitSummaryCard({ summary }) {
  const charges = summary?.charges || {};
  return (
    <section className="rounded-lg bg-ink p-5 text-white shadow-soft">
      <p className="text-sm uppercase tracking-wide text-stone-300">Total payable</p>
      <p className="mt-2 text-4xl font-black">₹{summary.grandTotal.toFixed(2)}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-white/10 p-3">
          <p className="text-stone-300">Items</p>
          <p className="font-semibold">₹{summary.allocatedSubtotal.toFixed(2)}</p>
        </div>
        <div className="rounded-md bg-white/10 p-3">
          <p className="text-stone-300">Extras</p>
          <p className="font-semibold">
            ₹{(charges.tax + charges.serviceCharge + charges.tip).toFixed(2)}
          </p>
        </div>
      </div>
      {summary.unassignedAmount > 0 && (
        <p className="mt-4 rounded-md bg-saffron/20 p-3 text-sm text-amber-100">
          ₹{summary.unassignedAmount.toFixed(2)} is unassigned because no participant
          matches one or more item categories.
        </p>
      )}
    </section>
  );
}
