const units=value=>value==null?null:Math.round(Number(value)*100);
const points=value=>value==null?null:units(value)/100;
const fromUnits=value=>value==null?null:value/100;

function athleteState(athlete,scores,clubMatches,roundFinal){
  const score=scores?.athletes?.[athlete.athlete_id]||null;
  if(score?.participation==='played'||score?.status==='played'||score?.raw_score!=null&&score?.participation!=='not_played')return{status:'played',rawScore:points(score.raw_score),played:true};
  if(score?.participation==='not_played'||score?.status==='not_played')return{status:'not_played',rawScore:null,played:false};
  const match=clubMatches?.[athlete.real_club_id]||null;
  if(roundFinal||match?.finished===true)return{status:'not_played',rawScore:null,played:false};
  return{status:'pending',rawScore:null,played:null};
}

function replacementOrder(players,lineup,clubMatches){
  return [...players].sort((a,b)=>{
    const ta=Number(clubMatches?.[a.real_club_id]?.timestamp??Number.MAX_SAFE_INTEGER),tb=Number(clubMatches?.[b.real_club_id]?.timestamp??Number.MAX_SAFE_INTEGER);
    if(ta!==tb)return ta-tb;
    if(a.athlete_id===lineup.captain_id)return-1;if(b.athlete_id===lineup.captain_id)return 1;
    if(Number(a.price||0)!==Number(b.price||0))return Number(b.price||0)-Number(a.price||0);
    return String(a.nickname||a.name||'').localeCompare(String(b.nickname||b.name||''),'pt-BR');
  });
}

export function projectEffectiveLineup(lineup,scores,{roundFinal=false}={}){
  const clubMatches=scores?.club_matches||{},original=(lineup.starters||[]).map(athlete=>({...athlete,...athleteState(athlete,scores,clubMatches,roundFinal),original:true,effective:true,replacement:null,captainMultiplier:1,effectiveScore:0}));
  const reserves=(lineup.reserves||[]).map(athlete=>({...athlete,...athleteState(athlete,scores,clubMatches,roundFinal),isLuxuryReserve:Number(athlete.athlete_id)===Number(lineup.luxury_reserve?.athlete_id),enteredFromBench:false,replacedAthleteId:null}));
  let finalCaptainId=Number(lineup.captain_id),normalSubstitutions=[];
  for(const reserve of reserves){
    const absent=replacementOrder(original.filter(player=>player.position===reserve.position&&player.status==='not_played'&&player.effective),lineup,clubMatches);
    if(!absent.length||reserve.status!=='played'||units(reserve.rawScore)<=0)continue;
    const replaced=absent[0];replaced.effective=false;replaced.replacement={type:'regular_reserve',athleteId:reserve.athlete_id};reserve.enteredFromBench=true;reserve.replacedAthleteId=replaced.athlete_id;
    const inheritsCaptain=replaced.athlete_id===lineup.captain_id;if(inheritsCaptain)finalCaptainId=reserve.athlete_id;
    normalSubstitutions.push({position:reserve.position,replacedAthleteId:replaced.athlete_id,reserveAthleteId:reserve.athlete_id,inheritsCaptain,priority:'chronological_then_captain_price_name'});
  }
  const rl=reserves.find(player=>player.isLuxuryReserve)||null;
  let luxury={athleteId:rl?.athlete_id??null,status:rl?'available':'nonexistent',triggered:false,replacedAthleteId:null,inheritsCaptain:false};
  if(rl?.enteredFromBench)luxury={...luxury,status:'used_as_regular_reserve'};
  else if(rl){
    const samePosition=original.filter(player=>player.position===rl.position),allPlayed=samePosition.length>0&&samePosition.every(player=>player.status==='played');
    if(!allPlayed)luxury={...luxury,status:samePosition.some(player=>player.status==='pending')?'waiting_for_matches':'regular_reserve_has_priority'};
    else if(rl.status!=='played')luxury={...luxury,status:rl.status==='pending'?'waiting_for_reserve':'not_played'};
    else{
      const lowest=Math.min(...samePosition.map(player=>units(player.rawScore))),candidates=replacementOrder(samePosition.filter(player=>units(player.rawScore)===lowest),lineup,clubMatches),replaced=candidates[0];
      if(units(rl.rawScore)>lowest){replaced.effective=false;replaced.replacement={type:'luxury_reserve',athleteId:rl.athlete_id};rl.enteredFromBench=true;rl.replacedAthleteId=replaced.athlete_id;const inheritsCaptain=replaced.athlete_id===lineup.captain_id;if(inheritsCaptain)finalCaptainId=rl.athlete_id;luxury={...luxury,status:'triggered',triggered:true,replacedAthleteId:replaced.athlete_id,inheritsCaptain};}
      else luxury={...luxury,status:'not_triggered'};
    }
  }
  const effective=[...original.filter(player=>player.effective),...reserves.filter(player=>player.enteredFromBench)];
  for(const player of effective){const raw=units(player.rawScore)||0,multiplier=player.athlete_id===finalCaptainId?1.5:1;player.captainMultiplier=multiplier;player.effectiveScore=fromUnits(Math.round(raw*multiplier));}
  const coachState=athleteState(lineup.coach,scores,clubMatches,roundFinal),coachScore=units(coachState.rawScore)||0,projectedUnits=effective.reduce((sum,player)=>sum+(units(player.effectiveScore)||0),coachScore);
  const unresolved=[...original,...reserves.filter(player=>player.enteredFromBench),{...lineup.coach,...coachState}].filter(player=>player.status==='pending').map(player=>player.athlete_id);
  const complete=unresolved.length===0,effectiveScore=complete?fromUnits(projectedUnits):null,officialScore=lineup.points==null?null:points(lineup.points),officialIsAuthoritative=roundFinal&&officialScore!=null,difference=officialIsAuthoritative&&complete?fromUnits(Math.abs(units(officialScore)-projectedUnits)):null;
  return{teamId:lineup.team_id,round:lineup.cartola_round,complete,projectedScore:fromUnits(projectedUnits),effectiveScore,officialScore,difference,officialIsAuthoritative,original,effective,reserves,coach:{...lineup.coach,...coachState,effectiveScore:fromUnits(coachScore)},captain:{originalAthleteId:lineup.captain_id,effectiveAthleteId:finalCaptainId,inherited:Number(finalCaptainId)!==Number(lineup.captain_id),multiplier:1.5},normalSubstitutions,luxuryReserve:luxury,unresolvedAthleteIds:unresolved,lineupSource:lineup.lineup_source,lineupInherited:lineup.lineup_inherited===true};
}
