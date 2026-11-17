const IDENTITIES = new Map([
  [10000001, '#f59e0b'], [10000002, '#2563eb'], [10000003, '#ef4444'],
  [10000004, '#22c55e'], [10000005, '#dc2626'], [10000006, '#111827'],
  [10000007, '#1e3a8a'], [10000008, '#f97316'], [10000009, '#1d4ed8'],
  [10000010, '#cbd5e1']
]);

export function clubIdentity(teamId) {
  const accent = IDENTITIES.get(Number(teamId));
  return accent ? { accent } : null;
}
