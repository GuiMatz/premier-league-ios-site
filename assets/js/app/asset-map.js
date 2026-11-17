const CLUB_ROOT = 'assets/media/clubs';
const COMPETITION_ROOT = 'assets/media/competitions';

export const CLUB_ASSETS = Object.freeze(Object.fromEntries([
  10000001, 10000010, 10000009, 10000005, 10000004,
  10000002, 10000003, 10000007, 10000008, 10000006
].map(teamId => [teamId, {
  logo: `${CLUB_ROOT}/${teamId}-logo.png`,
  mascot: `${CLUB_ROOT}/${teamId}-mascot.png`
}])));

export const COMPETITION_ASSETS = Object.freeze({
  'pl-ios': {logo:`${COMPETITION_ROOT}/premierleagueios-logo.png`, trophy:`${COMPETITION_ROOT}/premierleagueios-trophy.png`},
  pc1: {logo:`${COMPETITION_ROOT}/pc-logo.png`, trophy:`${COMPETITION_ROOT}/pc-trophy.png`},
  pc2: {logo:`${COMPETITION_ROOT}/pc-logo.png`, trophy:`${COMPETITION_ROOT}/pc-trophy.png`},
  'copa-ios': {logo:`${COMPETITION_ROOT}/copaios-logo.png`, trophy:`${COMPETITION_ROOT}/copaios-trophy.png`},
  iwc: {logo:`${COMPETITION_ROOT}/iosworldcup-logo.png`, trophy:`${COMPETITION_ROOT}/iosworldcup-trophy.png`},
  icwc: {logo:`${COMPETITION_ROOT}/iosclubworldcup-logo.png`, trophy:`${COMPETITION_ROOT}/iosclubworldcup-trophy.png`},
  'cartoleiro-de-ouro': {logo:`${COMPETITION_ROOT}/cartoleirodeouro-logo.png`, trophy:`${COMPETITION_ROOT}/cartoleirodeouro-trophy.png`}
});

export const OTHER_TEAM_ASSETS = Object.freeze([
  {team_id:'other:chereca-fc',official_name:'Chereca FC',short_name:'Chereca FC',name:'Chereca FC',logo:'assets/images/league-logo.png',crest:'assets/images/league-logo.png',mascot:null},
  {team_id:'other:jotaventus',official_name:'Jotaventus',short_name:'Jotaventus',name:'Jotaventus',logo:`${CLUB_ROOT}/jotaventus-logo.png`,crest:`${CLUB_ROOT}/jotaventus-logo.png`,mascot:`${CLUB_ROOT}/jotaventus-mascot.png`},
  {team_id:'other:lurroma',official_name:'Lurroma',short_name:'Lurroma',name:'Lurroma',logo:`${CLUB_ROOT}/lurroma-logo-normalized.png`,crest:`${CLUB_ROOT}/lurroma-logo-normalized.png`,mascot:`${CLUB_ROOT}/lurroma-mascot.png`}
]);

export const FALLBACK_ASSET = 'assets/images/league-logo.png';
export const clubAssets = teamId => CLUB_ASSETS[Number(teamId)] || {logo:FALLBACK_ASSET, mascot:null};
export const competitionAssets = competitionId => COMPETITION_ASSETS[competitionId] || {logo:FALLBACK_ASSET, trophy:null};
