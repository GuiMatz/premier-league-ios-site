import { calculateLiveTeamScore, provisionalAwards, reconcileComputedAndOfficialScore } from '../../lib/league/live-scoring.js';
const classify=value=>value.status==='match'?'MATCH':value.status==='difference'?'DIFFERENCE':value.status==='ambiguous'?'AMBIGUOUS':value.status==='partial'||value.status==='insufficient_data'?'INSUFFICIENT_DATA':value.status==='complete'?'MATCH':'ERROR';
export function compareShadow({lineups=[],athleteScores,officialScores={}}){
 const computed={};for(const lineup of lineups)computed[lineup.team_id]=calculateLiveTeamScore(lineup,athleteScores);
 const reconciliation=Object.fromEntries(Object.entries(computed).map(([id,value])=>[id,reconcileComputedAndOfficialScore({computed_live_score:value.computed_live_score,official_final_score:officialScores[id]??null})]));
 return{mode:'shadow_read_only',writes:false,computed,reconciliation,provisional_awards:provisionalAwards(computed),summary:{teams:Object.keys(computed).length,computed:Object.values(computed).filter(v=>v.complete).length,classifications:Object.fromEntries(Object.entries(reconciliation).map(([id,value])=>[id,classify(value)]))}};
}
