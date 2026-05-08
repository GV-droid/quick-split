const categories = ['veg', 'nonveg', 'drink', 'shared'];

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function eligibleParticipants(category, participants) {
  if (category === 'shared') return participants;
  if (category === 'veg') return participants.filter((participant) => participant.isVeg);
  if (category === 'nonveg') return participants.filter((participant) => participant.isNonVeg);
  if (category === 'drink') return participants.filter((participant) => participant.drinks);
  return [];
}

function emptyCategoryTotals() {
  return categories.reduce((acc, category) => ({ ...acc, [category]: 0 }), {});
}

export function calculateSplit({ participants, items, charges }) {
  const rows = participants.map((participant) => ({
    participantId: participant.id,
    name: participant.name,
    categories: emptyCategoryTotals(),
    itemSubtotal: 0,
    extraCharges: 0,
    total: 0,
  }));

  const byParticipantId = new Map(rows.map((row) => [row.participantId, row]));
  const categoryTotals = emptyCategoryTotals();
  const warnings = [];
  let unassignedAmount = 0;

  for (const item of items) {
    const eligible = eligibleParticipants(item.category, participants);
    if (eligible.length === 0) {
      unassignedAmount += Number(item.amount);
      warnings.push(
        `${item.name} was not split because no participant is eligible for ${item.category}.`,
      );
      continue;
    }

    const share = Number(item.amount) / eligible.length;
    categoryTotals[item.category] += Number(item.amount);

    for (const participant of eligible) {
      const row = byParticipantId.get(participant.id);
      row.categories[item.category] += share;
      row.itemSubtotal += share;
    }
  }

  const allocatedSubtotal = rows.reduce((sum, row) => sum + row.itemSubtotal, 0);
  const totalExtras =
    Number(charges.tax || 0) + Number(charges.serviceCharge || 0) + Number(charges.tip || 0);

  if (allocatedSubtotal === 0 && totalExtras > 0) {
    unassignedAmount += totalExtras;
    warnings.push('Tax, service charge, and tip cannot be allocated without eligible items.');
  }

  for (const row of rows) {
    const ratio = allocatedSubtotal > 0 ? row.itemSubtotal / allocatedSubtotal : 0;
    row.extraCharges = totalExtras * ratio;
    row.total = row.itemSubtotal + row.extraCharges;
    row.itemSubtotal = round(row.itemSubtotal);
    row.extraCharges = round(row.extraCharges);
    row.total = round(row.total);
    for (const category of categories) {
      row.categories[category] = round(row.categories[category]);
    }
  }

  return {
    participantCount: participants.length,
    itemCount: items.length,
    categoryTotals: Object.fromEntries(
      Object.entries(categoryTotals).map(([category, value]) => [category, round(value)]),
    ),
    charges: {
      tax: round(Number(charges.tax || 0)),
      serviceCharge: round(Number(charges.serviceCharge || 0)),
      tip: round(Number(charges.tip || 0)),
    },
    allocatedSubtotal: round(allocatedSubtotal),
    unassignedAmount: round(unassignedAmount),
    grandTotal: round(allocatedSubtotal + totalExtras),
    participants: rows,
    warnings,
  };
}
