function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

// SHA-256 em JavaScript puro: determinístico e sem dependência de Node, browser, HTTP ou filesystem.
export function sha256(text) {
  const bytes = unescape(encodeURIComponent(String(text))).split('').map(char => char.charCodeAt(0));
  const words = [], bitLength = bytes.length * 8;
  bytes.push(0x80); while ((bytes.length % 64) !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(Math.floor(bitLength / 2 ** (i * 8)) & 255);
  for (let i = 0; i < bytes.length; i += 4) words.push((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]);
  const k = [], primes = []; for (let n = 2; primes.length < 64; n++) { if (primes.every(p => n % p)) { primes.push(n); k.push((Math.cbrt(n) % 1 * 0x100000000) | 0); } }
  const h = primes.slice(0, 8).map(n => (Math.sqrt(n) % 1 * 0x100000000) | 0);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < words.length; offset += 16) {
    const w = words.slice(offset, offset + 16); for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = (((rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)) + w[i - 16] | 0) + ((rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10)) + w[i - 7] | 0)) | 0; }
    let [a,b,c,d,e,f,g,hh] = h;
    for (let i = 0; i < 64; i++) {
      const sigma1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const choose = (e & f) ^ (~e & g);
      const t1 = (hh + sigma1 + choose + k[i] + w[i]) | 0;
      const sigma0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (sigma0 + majority) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a,b,c,d,e,f,g,hh].forEach((value, i) => h[i] = (h[i] + value) | 0);
  }
  return h.map(value => (value >>> 0).toString(16).padStart(8, '0')).join('');
}

export const payloadHash = payload => sha256(canonical(payload));

export function createEvent({ schema_version = 1, season, cartola_round, event_type, scope_id, occurred_at, source, payload }) {
  const event_id = `${season}:${cartola_round}:${event_type}:${scope_id}`;
  return { event_id, schema_version, season: Number(season), cartola_round: Number(cartola_round), event_type, scope_id: String(scope_id), occurred_at, source, payload_hash: payloadHash(payload), payload };
}

export function reconcileEvent(existingEvents, event) {
  const existing = (existingEvents || []).find(value => value.event_id === event.event_id);
  if (!existing) return { status: 'apply', event };
  if (existing.payload_hash === event.payload_hash) return { status: 'noop', event: existing };
  return { status: 'conflict', event, existing };
}
