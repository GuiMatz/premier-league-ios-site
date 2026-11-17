import { CONFRONTOS, RESULTADOS } from '../legacy-data/pc.js';
import { PC_ARCHIVE, MUNDIAL_2025, COPA } from '../legacy-data/history.js';
import { COPA_IOS_2026, IOS_WORLD_CUP_2026 } from '../legacy-data/competitions.js';
import { leagueApi } from './league-api-client.js';
import { clubAssets } from './asset-map.js';

const json = async (url, timeout = 6500) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return await response.json();
  } finally { clearTimeout(timer); }
};

const byId = rows => Object.fromEntries(rows.map(row => [Number(row.team_id), row]));
const number = value => Number.isFinite(Number(value)) ? Number(value) : null;

async function fetchSnapshot(ids,fromRound=null) {
  if (['127.0.0.1', 'localhost'].includes(globalThis.location?.hostname)) throw new Error('API dinâmica não disponível no preview estático');
  const query=new URLSearchParams({ids:ids.join(',')});if(Number.isInteger(fromRound)&&fromRound>0)query.set('fromRound',String(fromRound));
  const payload = await json(`/api/cartola/snapshot?${query}`, 15000);
  return {market:payload.market || null, hasLiveScores:payload.hasLiveScores===true, roundComplete:payload.roundComplete===true, completedRound:payload.completedRound || null, completedRounds:Array.isArray(payload.completedRounds)?payload.completedRounds:payload.completedRound?[payload.completedRound]:[], teams:Object.fromEntries((payload.teams || []).map(team => [Number(team.id), {
    teamId: Number(team.id), roundPoints: number(team.roundPoints), totalPoints: number(team.totalPoints),
    wealth: number(team.budget), scaled: Boolean(team.scaled)
  }]))};
}

export function deriveRoundContext({market=null,completedRoundNumbers=[],hasLiveScores=false,fallbackRound=null}={}) {
  const cartolaRound=number(market?.round)??number(fallbackRound);
  const latestCompletedRound=completedRoundNumbers.map(Number).filter(Number.isFinite).sort((a,b)=>b-a)[0]??null;
  const predictionRound=market?.isOpen===true?cartolaRound:null;
  const liveRound=market?.isOpen===false&&hasLiveScores?cartolaRound:null;
  return {cartolaRound,marketStatus:market?.isOpen===true?'open':market?.isOpen===false?'closed':'unavailable',predictionRound,latestCompletedRound,liveRound,hasLiveScores:Boolean(hasLiveScores)};
}

export function mergeCompletedRoundBackfill(historyDoc,entries,season=2026){
  const valid=(entries||[]).filter(entry=>entry?.official===true&&entry?.trusted===true&&Number.isInteger(Number(entry.round)));
  if(!valid.length)return historyDoc;
  const additions=Object.fromEntries(valid.map(entry=>[String(entry.round),{scores:entry.scores,status:'final',source:entry.source,source_authoritative:true,engine_managed:false}]));
  return {...historyDoc,seasons:{...(historyDoc?.seasons||{}),[String(season)]:{...(historyDoc?.seasons?.[String(season)]||{}),cartola_rounds:{...(historyDoc?.seasons?.[String(season)]?.cartola_rounds||{}),...additions}}}};
}

export function projectPc2Backfill(fixtures,entries){
  return Object.fromEntries((entries||[]).flatMap(entry=>{const internal=Number(entry.round)-18,roundFixtures=fixtures?.[internal];if(internal<1||!Array.isArray(roundFixtures))return[];const matches=roundFixtures.flatMap(([a,b])=>{const pa=number(entry.scores?.[a]),pb=number(entry.scores?.[b]);return pa==null||pb==null?[]:[[Number(a),pa,Number(b),pb]];});return matches.length===5?[[internal,matches]]:[];}));
}

export function computeHeadToHead(clubs, results) {
  const rows = new Map(clubs.map(club => [club.team_id, { teamId: club.team_id, played: 0, wins: 0, draws: 0, losses: 0, points: 0, cartolaPoints: 0 }]));
  Object.keys(results || {}).map(Number).sort((a, b) => a - b).forEach(round => {
    (results[round] || []).forEach(([a, pa, b, pb]) => {
      a = Number(a); b = Number(b); pa = number(pa); pb = number(pb);
      if (!rows.has(a) || !rows.has(b) || pa == null || pb == null) return;
      const home = rows.get(a), away = rows.get(b); home.played++; away.played++; home.cartolaPoints += pa; away.cartolaPoints += pb;
      if (pa > pb) { home.wins++; away.losses++; home.points += 3; }
      else if (pb > pa) { away.wins++; home.losses++; away.points += 3; }
      else { home.draws++; away.draws++; home.points++; away.points++; }
    });
  });
  return [...rows.values()].sort((a, b) => b.points - a.points || b.cartolaPoints - a.cartolaPoints || b.wins - a.wins);
}

export function competitionRoundForCartola(competitions, competitionId, season, cartolaRound) {
  const competition=(competitions||[]).find(item=>item.competition_id===competitionId);
  const edition=competition?.seasons?.find(item=>Number(item.season)===Number(season));
  const mapping=edition?.round_mapping,round=number(cartolaRound);
  if(round==null||!mapping||round<Number(mapping.cartola_round_start)||round>Number(mapping.cartola_round_end))return null;
  if(mapping.type==='identity')return round;
  if(mapping.type==='offset')return round+Number(mapping.offset||0);
  return null;
}

export function projectLiveHeadToHeadStandings({officialRows=[],fixtures=[],liveScores={},season=2026,cartolaRound=null,competitionRound=null,completed=[]}={}) {
  const roundKey=`${Number(season)}:${Number(cartolaRound)}`;
  if(!Number.isInteger(Number(competitionRound))||!Number.isInteger(Number(cartolaRound))||(completed||[]).some(item=>item?.id===roundKey))return{rows:officialRows,applied:false,roundKey,reliableMatches:0};
  const rows=new Map(officialRows.map((row,index)=>[Number(row.teamId),{...row,teamId:Number(row.teamId),points:number(row.points)??0,wins:number(row.wins)??0,draws:number(row.draws)??0,losses:number(row.losses)??0,played:number(row.played)??0,cartolaPoints:number(row.cartolaPoints)??0,officialOrder:index}]));
  let reliableMatches=0;
  for(const pair of fixtures||[]){
    const a=Number(pair?.[0]),b=Number(pair?.[1]),pa=number(liveScores?.[a]?.value??liveScores?.[a]),pb=number(liveScores?.[b]?.value??liveScores?.[b]);
    if(!rows.has(a)||!rows.has(b)||pa==null||pb==null)continue;
    const home=rows.get(a),away=rows.get(b);home.played++;away.played++;home.cartolaPoints+=pa;away.cartolaPoints+=pb;
    if(pa>pb){home.wins++;away.losses++;home.points+=3}else if(pb>pa){away.wins++;home.losses++;away.points+=3}else{home.draws++;away.draws++;home.points++;away.points++}
    reliableMatches++;
  }
  if(!reliableMatches)return{rows:officialRows,applied:false,roundKey,reliableMatches:0};
  return{rows:[...rows.values()].sort((a,b)=>b.points-a.points||b.cartolaPoints-a.cartolaPoints||b.wins-a.wins||a.officialOrder-b.officialOrder),applied:true,roundKey,reliableMatches};
}

export function plStandings(clubs, scores) {
  const totals = new Map(clubs.map(club => [club.team_id, 0]));
  Object.values(scores || {}).forEach(round => Object.entries(round || {}).forEach(([id, points]) => {
    id = Number(id); if (totals.has(id) && number(points) != null) totals.set(id, totals.get(id) + Number(points));
  }));
  return [...totals].map(([teamId, cartolaPoints]) => ({ teamId, cartolaPoints })).sort((a, b) => b.cartolaPoints - a.cartolaPoints);
}

export function getPremierLeagueLeader(clubs, scores) {
  return plStandings(clubs, scores)[0] || null;
}

export function richestClub(live) {
  return Object.values(live || {}).reduce((richest, entry) => {
    if (entry?.wealth == null) return richest;
    return !richest || entry.wealth > richest.wealth ? entry : richest;
  }, null);
}

function historySeason(historyDoc, season) {
  return historyDoc?.seasons?.[String(season)] || null;
}

function historyRounds(historyDoc, season) {
  return historySeason(historyDoc, season)?.cartola_rounds || {};
}

export function seasonRecord(historyDoc, stateDoc, season) {
  const candidates = [];
  const seasonHistory = historySeason(historyDoc, season);
  Object.entries(seasonHistory?.cartola_rounds || {}).forEach(([round, entry]) => {
    Object.entries(entry?.scores || {}).forEach(([teamId, score]) => {
      const points = number(score?.points ?? score);
      if (points != null) candidates.push({teamId:Number(teamId), points, round:Number(round), competition:'Cartola'});
    });
  });
  (seasonHistory?.special_scores || []).forEach(entry => {
    const points = number(entry?.points), teamId = number(entry?.team_id), round = number(entry?.round);
    if (points != null && teamId != null) candidates.push({teamId, points, round, competition:entry.competition || 'Competição'});
  });
  if (!candidates.length) Object.entries(stateDoc?.round_scores || {}).forEach(([round, scores]) => {
    Object.entries(scores || {}).forEach(([teamId, points]) => {
      points = number(points); if (points != null) candidates.push({teamId:Number(teamId), points, round:Number(round), competition:'Cartola'});
    });
  });
  return candidates.reduce((record, candidate) => !record || candidate.points > record.points ? candidate : record, null);
}

export function historicalRound(historyDoc, season, cartolaRound) {
  const entry = historyRounds(historyDoc, season)?.[String(cartolaRound)];
  if (!entry) return null;
  const scores = Object.fromEntries(Object.entries(entry.scores || {}).flatMap(([teamId, value]) => {
    const points = number(value?.points ?? value);
    return points == null ? [] : [[Number(teamId), points]];
  }));
  return {
    cartolaRound:Number(cartolaRound), scores,
    mvpTeamId:number(entry.mvp_team_id), mvpPoints:number(entry.mvp_points),
    worstTeamId:number(entry.merda_team_id), worstPoints:number(entry.merda_points),
    competitions:Array.isArray(entry.competitions) ? entry.competitions : [],
    occurredAt:entry.occurred_at || entry.finished_at || null,
    source:entry.source || null
  };
}

export function recentHistoricalEvents(historyDoc, season, limit = 3) {
  return Object.keys(historyRounds(historyDoc, season)).map(Number).filter(Number.isFinite).sort((a,b)=>b-a).slice(0,limit)
    .map(round => historicalRound(historyDoc, season, round)).filter(Boolean);
}

export function latestCompletedRound(store) {
  const expectedTeams = store?.clubs?.length || 10;
  const candidates = [];
  Object.entries(store?.historicalRounds || {}).forEach(([round, entry]) => {
    const scores = Object.values(entry?.scores || {}).map(value => number(value?.points ?? value)).filter(value => value != null);
    if (scores.length >= expectedTeams) candidates.push(Number(round));
  });
  const collectComplete = (results, offset) => Object.entries(results || {}).forEach(([round, matches]) => {
    const valid = Array.isArray(matches) && matches.length > 0 && matches.every(match =>
      Array.isArray(match) && number(match[0]) != null && number(match[1]) != null && number(match[2]) != null && number(match[3]) != null
    );
    if (valid) candidates.push(Number(round) + offset);
  });
  collectComplete(store?.pc1Results, 0);
  collectComplete(store?.pc2Results, 18);
  const current = number(store?.currentCartolaRound);
  return candidates.filter(round => Number.isFinite(round) && (current == null || round <= current)).sort((a, b) => b - a)[0] || null;
}

const validMatch = match => Array.isArray(match) && match.length >= 4 &&
  number(match[0]) != null && number(match[1]) != null && number(match[2]) != null && number(match[3]) != null;

function roundResults(store, cartolaRound) {
  const round = Number(cartolaRound);
  const internalRound = round <= 18 ? round : round - 18;
  return (round <= 18 ? store?.pc1Results : store?.pc2Results)?.[internalRound] || [];
}

function roundFixtures(store, cartolaRound) {
  const round=Number(cartolaRound),internalRound=round<=18?round:round-18;
  return (round<=18?store?.pc1Fixtures:store?.pc2Fixtures)?.[internalRound] || [];
}

export function completedRounds(store) {
  const season = number(store?.stateDoc?.temporada_atual) || 2026;
  const expectedTeams = store?.clubs?.length || 10;
  const rounds = new Map();
  Object.entries(store?.historicalRounds || {}).forEach(([roundKey, entry]) => {
    const round = Number(roundKey);
    const scores = Object.fromEntries(Object.entries(entry?.scores || {}).flatMap(([teamId, value]) => {
      const points = number(value?.points ?? value);
      return points == null ? [] : [[Number(teamId), points]];
    }));
    const fixtures = roundResults(store, round).filter(validMatch).map(([a, pa, b, pb]) => ({
      teamA:Number(a), scoreA:Number(pa), teamB:Number(b), scoreB:Number(pb)
    }));
    const imported = store?.importedRounds?.[String(round)] || null;
    const trustedImport = imported?.status === 'concluded' && imported?.source_authoritative === true;
    if (Object.keys(scores).length < expectedTeams || fixtures.length * 2 < expectedTeams) return;
    rounds.set(`${season}:${round}`, {
      id:`${season}:${round}`, season, round, status:'final',
      source:trustedImport ? 'historical_import' : entry?.engine_managed === true ? 'engine' : 'historical',
      engineManaged:entry?.engine_managed === true,
      official:true, trusted:true, fixtures, scores,
      mvpTeamId:number(entry?.mvp_team_id), mvpPoints:number(entry?.mvp_points),
      worstTeamId:number(entry?.merda_team_id), worstPoints:number(entry?.merda_points)
    });
  });
  return [...rounds.values()].sort((a,b)=>a.season-b.season||a.round-b.round);
}

export function latestCompletedRoundMvp(store){
  const round=completedRounds(store).at(-1)||null;
  if(!round)return null;
  const scores=Object.entries(round.scores||{}).map(([teamId,points])=>({teamId:Number(teamId),points:Number(points)})).filter(row=>Number.isFinite(row.teamId)&&Number.isFinite(row.points));
  if(!scores.length)return null;
  const winner=scores.reduce((best,row)=>row.points>best.points?row:best);
  return {...winner,round:round.round,season:round.season};
}

export function selectedRoundSummary(store, cartolaRound) {
  const round = Number(cartolaRound);
  const liveRound=store?.roundContext?store.roundContext.liveRound:store?.currentCartolaRound;
  const season = number(store?.stateDoc?.temporada_atual) || 2026;
  const complete = completedRounds(store).find(item => item.season === season && item.round === round) || null;
  const historical = historicalRound(store?.historyDoc, season, round);
  const scores = complete?.scores || historical?.scores || (round === liveRound
    ? Object.fromEntries(Object.entries(store?.live || {}).flatMap(([teamId, value]) => value?.roundPoints == null ? [] : [[Number(teamId), Number(value.roundPoints)]]))
    : {});
  const finalFixtures = roundResults(store, round).filter(validMatch).map(([a, pa, b, pb]) => ({teamA:Number(a),scoreA:Number(pa),teamB:Number(b),scoreB:Number(pb)}));
  const fixtures = complete?.fixtures || (finalFixtures.length ? finalFixtures : roundFixtures(store,round).map(([a,b])=>({teamA:Number(a),scoreA:scores[Number(a)]??null,teamB:Number(b),scoreB:scores[Number(b)]??null})));
  return {
    season, round, status:complete ? 'final' : round === liveRound ? 'partial' : 'unavailable',
    source:complete?.source || null, engineManaged:complete?.engineManaged ?? null,
    fixtures, scores,
    mvpTeamId:complete?.mvpTeamId ?? historical?.mvpTeamId ?? null,
    mvpPoints:complete?.mvpPoints ?? historical?.mvpPoints ?? null,
    worstTeamId:complete?.worstTeamId ?? historical?.worstTeamId ?? null,
    worstPoints:complete?.worstPoints ?? historical?.worstPoints ?? null
  };
}

function stateCounter(stateDoc, field, clubEntry) {
  const source = stateDoc?.[field] || {};
  for (const key of [clubEntry?.official_name, clubEntry?.short_name]) if (key && source[key] != null) return Number(source[key]) || 0;
  return 0;
}

export function allScoreRecords(store) {
  const records = new Map();
  Object.entries(store?.historyDoc?.seasons || {}).forEach(([season, seasonEntry]) => {
    Object.entries(seasonEntry?.cartola_rounds || {}).forEach(([round, entry]) => Object.entries(entry?.scores || {}).forEach(([teamId, value]) => {
      if(Number(season)===2026&&Number(round)>22)return;
      const points = number(value?.points ?? value);
      if (points == null) return;
      const id = `${season}:${round}:${teamId}:cartola`;
      records.set(id,{id,season:Number(season),round:Number(round),teamId:Number(teamId),points,competition:(entry.competitions||[]).join(' / ')||'Cartola'});
    }));
    (seasonEntry?.special_scores || []).forEach((entry,index) => {
      const points=number(entry?.points),teamId=number(entry?.team_id),round=number(entry?.round);
      if (points==null||teamId==null)return;
      const id=`${season}:${round}:${teamId}:special:${index}`;
      records.set(id,{id,season:Number(season),round,teamId,points,competition:entry.competition||'Competição'});
    });
  });
  (store?.historyDoc?.legacy_records || []).forEach((entry,index) => {
    const points=number(entry?.points),teamId=number(entry?.team_id),round=number(entry?.round),season=number(entry?.year);
    if(points==null||teamId==null||season==null)return;
    const id=`${season}:${round}:${teamId}:legacy:${index}`;
    records.set(id,{id,season,round,teamId,points,competition:entry.competition||'Histórico'});
  });
  completedRounds(store).forEach(round => Object.entries(round.scores).forEach(([teamId,value]) => {
    const points=number(value),id=`${round.season}:${round.round}:${teamId}:cartola`;
    if(points==null||records.has(id))return;
    records.set(id,{id,season:Number(round.season),round:Number(round.round),teamId:Number(teamId),points,competition:'Cartola'});
  }));
  return [...records.values()].sort((a,b)=>b.points-a.points||a.season-b.season||a.round-b.round);
}

export function deriveLeagueStatistics(store, { baselineAsOfRound = 22 } = {}) {
  const rows = new Map((store?.clubs || []).map(team => {
    const base = store?.stateDoc?.aproveitamento?.[team.official_name] || store?.stateDoc?.aproveitamento?.[team.short_name] || {};
    return [Number(team.team_id), {teamId:Number(team.team_id),played:Number(base.j)||0,wins:Number(base.v)||0,draws:Number(base.e)||0,losses:Number(base.d)||0,
      mvp:stateCounter(store.stateDoc,'mvp_historico',team),merda:stateCounter(store.stateDoc,'merda_historico',team),zikado:stateCounter(store.stateDoc,'zikado',team)}];
  }));
  const appliedRoundIds=[], awardAmbiguities=[];
  completedRounds(store).filter(item => item.season > 2026 || item.season === 2026 && item.round > baselineAsOfRound).forEach(round => {
    if (appliedRoundIds.includes(round.id)) return;
    appliedRoundIds.push(round.id);
    round.fixtures.forEach(match => {
      const a=rows.get(match.teamA),b=rows.get(match.teamB);if(!a||!b)return;a.played++;b.played++;
      if(match.scoreA>match.scoreB){a.wins++;b.losses++;}else if(match.scoreB>match.scoreA){b.wins++;a.losses++;}else{a.draws++;b.draws++;}
    });
    const scoreRows=Object.entries(round.scores).map(([teamId,points])=>({teamId:Number(teamId),points:Number(points)})).sort((a,b)=>b.points-a.points);
    const max=scoreRows[0]?.points,min=scoreRows.at(-1)?.points;
    const mvps=scoreRows.filter(row=>row.points===max),worsts=scoreRows.filter(row=>row.points===min);
    if(mvps.length===1){rows.get(mvps[0].teamId).mvp++;for(const row of rows.values())row.zikado=row.teamId===mvps[0].teamId?0:row.zikado+1;}
    else awardAmbiguities.push({roundId:round.id,award:'mvp',teamIds:mvps.map(row=>row.teamId)});
    if(worsts.length===1)rows.get(worsts[0].teamId).merda++;
    else awardAmbiguities.push({roundId:round.id,award:'merda',teamIds:worsts.map(row=>row.teamId)});
  });
  return {baselineAsOfRound,appliedRoundIds,awardAmbiguities,rows:[...rows.values()],records:allScoreRecords(store)};
}

export function clubStatistics(store, teamId, projection = deriveLeagueStatistics(store)) {
  teamId = Number(teamId);
  const totals = projection.rows.find(row => Number(row.teamId) === teamId) || null;
  if (!totals) return null;
  const records = projection.records.filter(row => Number(row.teamId) === teamId);
  const chronological = [...records].sort((a,b)=>b.season-a.season||b.round-a.round);
  const scoreAverage = records.length ? records.reduce((sum,row)=>sum+Number(row.points),0)/records.length : null;
  const pc2 = store?.standings?.pc2 || [], pc2Index = pc2.findIndex(row => Number(row.teamId) === teamId);
  const rounds = completedRounds(store).filter(round => round.scores[teamId] != null).sort((a,b)=>b.season-a.season||b.round-a.round);
  const recentRounds = rounds.slice(0,5).map(round => {
    const fixture = round.fixtures.find(match => match.teamA===teamId || match.teamB===teamId) || null;
    const own = fixture ? (fixture.teamA===teamId?fixture.scoreA:fixture.scoreB) : Number(round.scores[teamId]);
    const opponent = fixture ? (fixture.teamA===teamId?fixture.scoreB:fixture.scoreA) : null;
    return {season:round.season,round:round.round,points:Number(round.scores[teamId]),result:opponent==null?null:own>opponent?'V':own<opponent?'D':'E',source:round.source};
  });
  return {
    ...totals,
    rate:totals.played ? totals.wins/totals.played*100 : null,
    average:scoreAverage,
    best:records.length ? records.reduce((best,row)=>row.points>best.points?row:best,records[0]) : null,
    worst:records.length ? records.reduce((worst,row)=>row.points<worst.points?row:worst,records[0]) : null,
    records:chronological,
    recentRounds,
    latestScore:chronological[0] || null,
    pc2Position:pc2Index<0?null:pc2Index+1,
    pc2Row:pc2Index<0?null:pc2[pc2Index]
  };
}

function archiveRows(key) {
  return (PC_ARCHIVE[key]?.rows || []).map(([teamId, points, wins, draws, losses, cartolaPoints]) => ({teamId, points, wins, draws, losses, played: wins + draws + losses, cartolaPoints}));
}

export async function loadStore() {
  const [clubsDoc, competitionsDoc, stateDoc, historySource, historicalImports, apiResults] = await Promise.all([
    json('data/catalog/clubs.json'), json('data/catalog/competitions.json'), json('data/state_public.json'),
    json('data/historico_rodadas.json').catch(() => null),
    json('data/historical-imports.json').catch(() => ({rounds:{}})),
    Promise.allSettled([leagueApi.status(),leagueApi.clubs(),leagueApi.standings('pl-ios'),leagueApi.standings('pc1'),leagueApi.standings('pc2'),leagueApi.records(),leagueApi.history(),leagueApi.health()])
  ]);
  const importedRounds = historicalImports?.rounds || {};
  const importedHistory = Object.fromEntries(Object.entries(importedRounds).map(([round, entry]) => [round, {
    scores:entry.scores, source:entry.source, source_status:entry.provenance,
    engine_managed:entry.engine_managed, lineups_status:entry.lineups_status,
    competitions:[entry.competition_id]
  }]));
  let historyDoc = {
    ...(historySource || {}),
    seasons:{...(historySource?.seasons || {}), '2026':{
      ...(historySource?.seasons?.['2026'] || {}),
      cartola_rounds:{...(historySource?.seasons?.['2026']?.cartola_rounds || {}), ...importedHistory}
    }}
  };
  const apiValue=index=>apiResults[index].status==='fulfilled'?apiResults[index].value:null;
  const apiStatus=apiValue(0),apiClubs=apiValue(1),apiPl=apiValue(2),apiPc1=apiValue(3),apiPc2=apiValue(4),apiRecords=apiValue(5),apiHistory=apiValue(6),apiHealth=apiValue(7);
  const clubs = (apiClubs?.data?.clubs || clubsDoc.clubs).map(entry => ({...entry, crest:clubAssets(entry.team_id).logo, mascot:clubAssets(entry.team_id).mascot})), clubsById = byId(clubs), competitions = competitionsDoc.competitions;
  const persistedRoundNumbers=Object.entries(historyDoc?.seasons?.['2026']?.cartola_rounds||{}).flatMap(([round,entry])=>Object.keys(entry?.scores||{}).length>=clubs.length?[Number(round)]:[]);
  const backfillFrom=(persistedRoundNumbers.sort((a,b)=>b-a)[0]??0)+1;
  const snapshot = await fetchSnapshot(clubs.map(entry=>entry.team_id),backfillFrom).catch(()=>null);
  const classicSnapshot = await json('/api/cartola/classic-league',12000).catch(()=>null);
  const live = snapshot ? snapshot.teams : {}, apiState = apiStatus ? (apiStatus.status === 'available' ? 'ready' : apiStatus.status) : 'unavailable';
  const updated = stateDoc.updated_at ? new Date(stateDoc.updated_at) : null;
  const stale = !updated || Date.now() - updated.getTime() > 6 * 60 * 60 * 1000;
  const rollovers=(snapshot?.completedRounds||[]).filter(entry=>entry?.official===true&&entry?.trusted===true).sort((a,b)=>Number(a.round)-Number(b.round));
  const rollover=rollovers.at(-1)||null;
  historyDoc=mergeCompletedRoundBackfill(historyDoc,rollovers,2026);
  const importedPc2Results = Object.fromEntries(Object.values(importedRounds).filter(entry => entry.competition_id === 'pc2' && Array.isArray(entry.matches)).map(entry => [String(entry.competition_round), entry.matches]));
  const pc2Fixtures=stateDoc.pc2_confrontos||{};
  const rolloverPc2Results=projectPc2Backfill(pc2Fixtures,rollovers);
  const pc2Results = {...(stateDoc.pc2_resultados || {}), ...importedPc2Results,...rolloverPc2Results};
  const fallbackRound=Math.max(number(stateDoc.rodada)||0,number(historicalImports?.current_cartola_round)||0);
  const currentCartolaRound=number(snapshot?.market?.round)??fallbackRound;
  const currentPc2Round=currentCartolaRound>=19?currentCartolaRound-18:number(stateDoc.pc2_round);
  const mergedRoundScores={...(stateDoc.round_scores||{})};
  Object.entries(historyDoc?.seasons?.['2026']?.cartola_rounds||{}).forEach(([round,entry])=>{const scores=Object.fromEntries(Object.entries(entry?.scores||{}).flatMap(([id,value])=>{const points=number(value?.points??value);return points==null?[]:[[id,points]];}));if(Object.keys(scores).length===clubs.length)mergedRoundScores[round]=scores;});
  const apiRows=envelope=>(envelope?.data?.rows||[]).map(row=>({teamId:Number(row.team_id),points:number(row.points),wins:number(row.wins),draws:number(row.draws),losses:number(row.losses),played:number(row.played),cartolaPoints:number(row.cartola_points??row.points)}));
  const cartolaClassicRows=Array.isArray(classicSnapshot?.rows)&&classicSnapshot.rows.length===clubs.length?classicSnapshot.rows.flatMap(row=>number(row.totalPoints)==null?[]:[{teamId:Number(row.teamId),cartolaPoints:number(row.totalPoints)}]).sort((a,b)=>b.cartolaPoints-a.cartolaPoints):null;
  const officialClassicRows=rollover&&Object.keys(rollover.totals||{}).length===clubs.length?clubs.map(team=>({teamId:Number(team.team_id),cartolaPoints:number(rollover.totals[team.team_id])})).filter(row=>row.cartolaPoints!=null).sort((a,b)=>b.cartolaPoints-a.cartolaPoints):null;
  const premierLeagueRows = cartolaClassicRows?.length===clubs.length?cartolaClassicRows:officialClassicRows || plStandings(clubs, mergedRoundScores);
  const standings = {
    'pl-ios': premierLeagueRows,
    pc1: apiRows(apiPc1).length ? apiRows(apiPc1) : archiveRows('PC/1 2026'),
    pc2: apiRows(apiPc2).length ? apiRows(apiPc2) : computeHeadToHead(clubs, pc2Results),
    iwc: IOS_WORLD_CUP_2026.map(([teamId, points]) => ({teamId, points})),
    icwc: MUNDIAL_2025.map(([teamId, points, wins, losses, cartolaPoints]) => ({teamId, points, wins, draws: 0, losses, played: wins + losses, cartolaPoints}))
  };
  const standingsByEdition = {
    'pc1-2024': archiveRows('PC 2024'), 'pc1-2025': archiveRows('PC/1 2025'), 'pc1-2026': standings.pc1,
    'pc2-2025': archiveRows('PC/2 2025'), 'pc2-2026': standings.pc2,
    'iwc-2026': standings.iwc, 'icwc-2025': standings.icwc, 'pl-ios-2026': standings['pl-ios']
  };
  const final = COPA_IOS_2026.rounds.find(row => row.phase === 'Final')?.matches?.[0];
  const third = COPA_IOS_2026.rounds.find(row => row.phase.includes('Lugar'))?.matches?.[0];
  const win = match => match ? (match[1] > match[3] ? match[0] : match[2]) : null;
  const lose = match => match ? (match[1] > match[3] ? match[2] : match[0]) : null;
  const copaByEdition = {'copa-ios-2026': {rounds: COPA_IOS_2026.rounds, podium: [win(final), lose(final), win(third)]}};
  for (const year of [2024, 2025]) {
    const editionRows = COPA.filter(row => row[0] === `Copa IOS ${year}` && row[2] != null);
    const finalRow = editionRows.find(row => row[1] === 'Final');
    const thirdRow = editionRows.find(row => String(row[1]).includes('Lugar'));
    if (finalRow) copaByEdition[`copa-ios-${year}`] = {rounds: editionRows, podium: [finalRow[2], finalRow[3], thirdRow?.[2] ?? null]};
  }
  const season = number(stateDoc.temporada_atual);
  const apiRecord=apiRecords?.data?.records?.[0], apiHolder=apiRecord?.holders?.[0];
  const record = apiHolder ? {teamId:Number(apiHolder.team_id),points:number(apiHolder.score),round:number(apiHolder.round),competition:apiHolder.competition} : seasonRecord(historyDoc, stateDoc, season);
  const historicalRounds=historyRounds(historyDoc,season);
  const completedRoundNumbers=Object.entries(historicalRounds).flatMap(([round,entry])=>Object.keys(entry?.scores||{}).length>=clubs.length?[Number(round)]:[]);
  const roundContext=deriveRoundContext({market:snapshot?.market,completedRoundNumbers,hasLiveScores:snapshot?.hasLiveScores===true,fallbackRound:currentCartolaRound});
  return {
    state: stale ? 'stale' : apiState === 'ready' ? 'ready' : 'partial', apiState, stale, updated,
    clubs, clubsById, competitions, stateDoc, historyDoc, live, standings, standingsByEdition,
    currentCartolaRound, currentPc2Round, roundContext,
    premierLeagueLeader: premierLeagueRows[0] || null,
    marketStatus: snapshot?.market?.isOpen===true?'Mercado aberto':snapshot?.market?.isOpen===false?'Mercado fechado':'Indisponível',
    lastMvp: stateDoc.stats_last_round ? {round: number(stateDoc.stats_last_round.round), teamId: number(stateDoc.stats_last_round.mvp_team_id), points: number(stateDoc.stats_last_round.mvp_points)} : null,
    market:snapshot?.market||null, classicLeague:{source:classicSnapshot?.source||'completed_round_fallback',updatedAt:classicSnapshot?.updatedAt||rollover?.fetchedAt||null,stale:classicSnapshot?.stale===true},
    historicalRounds, recentEvents: recentHistoricalEvents(historyDoc, season),
    importedRounds, roundProvenance:Object.fromEntries(Object.entries(importedRounds).map(([round, entry]) => [round, {
      provenance:entry.provenance, engineManaged:entry.engine_managed === true,
      lineupsStatus:entry.lineups_status, source:entry.source
    }])),
    record, api:{status:apiStatus,health:apiHealth,history:apiHistory,records:apiRecords}, sourceMode:apiStatus?'league_api_with_legacy_fallback':'legacy_fallback',
    pc1Fixtures: CONFRONTOS, pc1Results: {...RESULTADOS, ...(stateDoc.resultados_pc_extra || {})},
    pc2Fixtures, pc2Results,
    copa: copaByEdition['copa-ios-2026'], copaByEdition
  };
}

export const formatPoints = value => value == null ? '—' : Number(value).toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 2});
export const club = (store, id) => store.clubsById[Number(id)] || null;
export const crest = entry => entry?.crest || 'assets/images/league-logo.png';
