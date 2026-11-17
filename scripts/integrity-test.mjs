import { readFile } from 'node:fs/promises';
import { plStandings, computeHeadToHead, richestClub, historicalRound, recentHistoricalEvents, seasonRecord } from '../assets/js/app/data-store.js';

const root = new URL('../', import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const clubs = (await readJson('data/catalog/clubs.json')).clubs;
const state = await readJson('data/state_public.json');
const history = await readJson('data/historico_rodadas.json');
const fail = message => { throw new Error(message); };

const pl = plStandings(clubs, state.round_scores);
if (!pl.length || pl[0].teamId !== 10000001) fail('A: líder PL IOS não foi derivado da maior pontuação acumulada real');
if (pl.some((row, index) => index && row.cartolaPoints > pl[index - 1].cartolaPoints)) fail('A: classificação PL IOS não está em ordem decrescente');

const pc2 = computeHeadToHead(clubs, state.pc2_resultados);
if (!pc2.length || pc2[0].teamId !== 10000001) fail('B: líder PC/2 não corresponde à tabela calculada dos resultados oficiais');

const richest = richestClub({a:{teamId:1,wealth:null},b:{teamId:2,wealth:112.5},c:{teamId:3,wealth:130.2}});
if (richest?.teamId !== 3 || richest.wealth !== 130.2) fail('C: clube mais rico não foi obtido pelo maior patrimônio conhecido');
if (richestClub({a:{teamId:1,wealth:null}}) !== null) fail('C: patrimônio ausente foi convertido em valor conhecido');

const season = history.seasons['2026'];
if (!season?.cartola_rounds?.['1'] || !season?.cartola_rounds?.['18']) fail('D: histórico Cartola R01–R18 não está disponível');
if (!state.resultados_pc_extra?.['18']) fail('D: resultados PC/1 R18 não foram incorporados pela fonte atual');

if (Number(state.rodada) !== 23 || Number(state.pc2_round) !== Number(state.rodada) - 18 || Number(state.pc2_round) !== 5) fail('E: Cartola R23 não corresponde a PC/2 R05');

const round18 = historicalRound(history, 2026, 18);
if (!round18?.mvpTeamId || round18.mvpPoints == null) fail('F: rodada histórica finalizada não retorna MVP registrado');
if (!round18?.worstTeamId || round18.worstPoints == null) fail('F: rodada histórica finalizada não retorna Merda da Rodada registrada');

const storage = new Map([
  ['plios.preferences.v1', JSON.stringify({name:'QA', favoriteTeamId:10000001})],
  ['pliosProfile', JSON.stringify({name:'Legado', favoriteTeamId:10000003})]
]);
globalThis.localStorage = {getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
const { readPreferences } = await import('../assets/js/app/profile.js');
for (const page of ['Home','Escalações','Times']) {
  const preference = readPreferences(clubs);
  if (preference.favoriteTeamId !== 10000001) fail(`G: ${page} não preservou Shaktar após reload`);
}
storage.set('plios.preferences.v1', JSON.stringify({name:'', favoriteTeamId:10000001}));
if (readPreferences(clubs).favoriteTeamId !== 10000001) fail('G: chave legada sobrescreveu preferência canônica incompleta');

const record = seasonRecord(history, state, 2026);
if (!record || record.points !== 145 || record.teamId !== 10000001) fail('H: recorde da temporada não é o máximo estável do histórico oficial');
const allCandidates = [
  ...Object.values(season.cartola_rounds).flatMap(round => Object.entries(round.scores || {}).map(([teamId,value]) => ({teamId:Number(teamId),points:Number(value?.points ?? value)}))),
  ...(season.special_scores || []).map(value => ({teamId:Number(value.team_id),points:Number(value.points)}))
];
if (record.points !== Math.max(...allCandidates.map(value => value.points))) fail('H: recorde não corresponde ao MAX das pontuações históricas');

const events = recentHistoricalEvents(history, 2026, 3);
if (!events.length || events.some(event => event.occurredAt != null)) fail('I: acontecimentos receberam datas não presentes no histórico');

const lineupHtml = await readFile(new URL('escalacoes.html', root), 'utf8');
const lineupModule = await readFile(new URL('assets/js/app/lineups.js', root), 'utf8');
if (!lineupHtml.includes('legacy-lineup-prototype-disabled') || !lineupHtml.includes('assets/js/app/lineups.js')) fail('J: protótipo de escalação ainda está ativo');
for (const demoName of ['Weverton','Arrascaeta','Hulk','Abel Ferreira']) if (lineupModule.includes(demoName)) fail(`J: atleta demonstrativo ativo em lineups.js: ${demoName}`);

console.log('OK: integridade, data binding, histórico, perfil e ausência de lineup demonstrativo validados.');
