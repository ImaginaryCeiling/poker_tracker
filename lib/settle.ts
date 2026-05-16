export type Balance = { playerId: number; name: string; net: number };
export type Transfer = { from: string; to: string; amount: number };

// Greedy min-transactions settlement. Good enough for poker-night sized groups.
export function settle(balances: Balance[], epsilon = 0.01): Transfer[] {
  const debtors = balances
    .filter((b) => b.net < -epsilon)
    .map((b) => ({ ...b, net: b.net }))
    .sort((a, b) => a.net - b.net); // most negative first
  const creditors = balances
    .filter((b) => b.net > epsilon)
    .map((b) => ({ ...b, net: b.net }))
    .sort((a, b) => b.net - a.net); // most positive first

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const amount = Math.min(-d.net, c.net);
    if (amount > epsilon) {
      transfers.push({
        from: d.name,
        to: c.name,
        amount: Math.round(amount * 100) / 100,
      });
    }
    d.net += amount;
    c.net -= amount;
    if (Math.abs(d.net) < epsilon) i++;
    if (Math.abs(c.net) < epsilon) j++;
  }
  return transfers;
}
