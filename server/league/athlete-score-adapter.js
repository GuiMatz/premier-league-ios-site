import { normalizeAthleteScores } from '../../lib/league/live-scoring.js';
export function adaptCartolaAthleteScores(payload,{fetchedAt,cartolaRound}={}){
 const raw=payload?.atletas||{},athletes={};
 for(const [key,value] of Object.entries(raw)){const id=Number(value.atleta_id??key),played=value.entrou_em_campo===true,score=value.pontuacao??value.pontos_num??null;athletes[id]={athlete_id:id,raw_score:score,participation:played?'played':value.entrou_em_campo===false?'not_played':'unknown',entered_field:value.entrou_em_campo??null,status:played?'played':value.entrou_em_campo===false?'not_played':score==null?'unavailable':'known',source:'cartola:atletas/pontuados'};}
 const clubs=Object.fromEntries(Object.entries(payload?.clubes||{}).map(([key,value])=>[Number(value?.id??key),{club_id:Number(value?.id??key),name:value?.apelido||value?.nome||null,abbreviation:value?.abreviacao||null,crest:value?.escudos?.['60x60']||value?.escudos?.['45x45']||value?.escudos?.['30x30']||null}]));
 return {...normalizeAthleteScores({schema_version:2,fetched_at:fetchedAt,cartola_round:cartolaRound??payload?.rodada,athletes,source:'cartola:atletas/pontuados'}),clubs};
}
