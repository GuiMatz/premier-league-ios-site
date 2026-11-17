import { readFile } from 'node:fs/promises';
import { getPremierLeagueLeader } from '../assets/js/app/data-store.js';
import { pc2ClassificationUrl } from '../assets/js/app/navigation.js';
import { clubIdentity } from '../assets/js/app/club-identity.js';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const readJson = async path => JSON.parse(await read(path));
const fail = message => { throw new Error(message); };

const route = new URL(pc2ClassificationUrl(2026), 'http://qa.local/');
if (route.pathname !== '/competicao.html' || route.searchParams.get('competition') !== 'pc2' || route.searchParams.get('season') !== '2026' || route.searchParams.get('view') !== 'classification') {
  fail('1: CTA da Home não resolve a classificação oficial do PC/2 2026');
}
const homeModule = await read('assets/js/app/home.js');
if (!homeModule.includes('pc2ClassificationUrl(2026)')) fail('1: Home não usa o helper compartilhado do PC/2');

const clubs = (await readJson('data/catalog/clubs.json')).clubs;
const state = await readJson('data/state_public.json');
const leader = getPremierLeagueLeader(clubs, state.round_scores);
if (!leader) fail('2: líder da Premier League IOS não foi derivado');
const seasonModule = await read('assets/js/app/season.js');
if (!homeModule.includes('store.premierLeagueLeader') || !seasonModule.includes('store.premierLeagueLeader')) fail('2: Home e Temporada não consomem a mesma regra compartilhada');
if (leader.teamId !== 10000001) fail('2: dados atuais não resolvem naturalmente o líder esperado pela classificação real');
if (seasonModule.includes('Paris Saint Zuis') || seasonModule.includes('Shaktar Meminetsk')) fail('2: módulo da Temporada contém líder nominal hardcoded');

const identities = clubs.map(entry => ({ teamId: entry.team_id, identity: clubIdentity(entry.team_id) }));
const missing = identities.filter(entry => !entry.identity?.accent);
if (missing.length) fail(`3: ${missing.length} clube(s) sem identidade visual resolvida`);
if (new Set(identities.map(entry => entry.identity.accent)).size !== clubs.length) fail('3: os dez clubes não possuem identidades visuais individuais');
const teamsModule = await read('assets/js/app/teams.js');
if (!teamsModule.includes('clubIdentity(entry.team_id)') || !teamsModule.includes('--club:${identity.accent}')) fail('3: cards de Times não aplicam a identidade resolvida por team_id');

console.log('OK: CTA PC/2, líder compartilhado e identidades visuais dos 10 clubes validados.');
