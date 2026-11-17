import {readPreferences,mountProfile} from './profile.js';
import {normalizeNavigation} from './navigation.js';
import {leagueApi} from './league-api-client.js';

normalizeNavigation();

let clubs=[];
try{
  const {data}=await leagueApi.clubs();
  clubs=data?.clubs||[];
}catch(error){
  console.warn('[PLIOS] Catálogo remoto indisponível; usando catálogo público local.',error);
  try{
    const response=await fetch('data/catalog/clubs.json');
    const data=await response.json();
    clubs=(data.clubs||[]).map(club=>({...club,official_name:club.official_name||club.name,short_name:club.short_name||club.name}));
  }catch(fallbackError){
    console.error('[PLIOS] Perfil local indisponível.',fallbackError);
  }
}
if(clubs.length)mountProfile(clubs,readPreferences(clubs));
