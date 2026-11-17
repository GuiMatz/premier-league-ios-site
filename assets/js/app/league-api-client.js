const API_ROOT = '/api/league';
const SEMANTIC_STATUSES = new Set(['available', 'healthy', 'degraded', 'partial', 'unavailable', 'ambiguous', 'consolidated_only']);

export class LeagueApiClientError extends Error {
  constructor(code, message, details = {}) { super(message); this.name = 'LeagueApiClientError'; this.code = code; this.details = details; }
}

function queryString(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') params.set(key, String(value)); });
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function preserveUncertainty(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(preserveUncertainty);
  if (typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, preserveUncertainty(entry)]));
}

export function createLeagueApiClient({fetchImpl = globalThis.fetch, baseUrl = API_ROOT, timeout = 6500} = {}) {
  if (typeof fetchImpl !== 'function') throw new LeagueApiClientError('FETCH_UNAVAILABLE', 'Cliente HTTP indisponível.');
  async function get(endpoint, query = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    let response;
    try { response = await fetchImpl(`${baseUrl}/${endpoint}${queryString(query)}`, {method:'GET', headers:{Accept:'application/json'}, cache:'no-store', signal:controller.signal}); }
    catch (error) { throw new LeagueApiClientError(error?.name === 'AbortError' ? 'API_TIMEOUT' : 'API_UNAVAILABLE', 'A API da liga está indisponível.', {endpoint}); }
    finally { clearTimeout(timer); }
    let payload;
    try { payload = await response.json(); } catch { throw new LeagueApiClientError('INVALID_API_RESPONSE', 'A API retornou uma resposta inválida.', {endpoint, status:response.status}); }
    if (!response.ok || payload?.ok !== true) throw new LeagueApiClientError(payload?.error?.code || `HTTP_${response.status}`, payload?.error?.message || 'Não foi possível carregar os dados.', {endpoint, status:response.status});
    return {...payload, status:SEMANTIC_STATUSES.has(payload.status) ? payload.status : 'available', data:preserveUncertainty(payload.data)};
  }
  return {
    get, status:()=>get('status'), state:()=>get('state'), standings:(competition,season=2026)=>get('standings',{competition,season}),
    rounds:(round,season=2026)=>get('rounds',{round,season}), lineups:(round,season=2026,teamId=null)=>get('lineups',{round,season,team_id:teamId}),
    ownership:(round,season=2026)=>get('ownership',{round,season}), impact:(athleteId,round,season=2026)=>get('impact',{athlete_id:athleteId,round,season}),
    live:(round,season=2026)=>get('live',{round,season}), records:(season=2026)=>get('records',{season}), clubs:()=>get('clubs'), history:()=>get('history'), health:()=>get('health')
  };
}

export const leagueApi = createLeagueApiClient();
