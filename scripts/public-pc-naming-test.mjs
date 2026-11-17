import assert from 'node:assert/strict';
import fs from 'node:fs';
import {publicCompetitionLabel} from '../assets/js/app/public-labels.js';

const root=new URL('../',import.meta.url),read=file=>fs.readFileSync(new URL(file,root),'utf8');
const state=JSON.parse(read('data/state_public.json'));
const renderedTitles=Object.values(state.conquistas||{}).flat().map(publicCompetitionLabel);
assert.equal(renderedTitles.some(title=>/P(?:i|o)ntos Corridos/i.test(title)),false);
assert.ok(renderedTitles.includes('PC 2024'));
assert.ok(renderedTitles.includes('PC/1 2025'));
assert.ok(renderedTitles.includes('PC/2 2025'));
for(const file of ['times.html','clube.html','historia.html','assets/js/app/teams.js','assets/js/app/club-refresh.js','assets/js/app/club-historical.js','assets/js/app/season.js','assets/js/app/competition.js'])assert.doesNotMatch(read(file),/P(?:i|o)ntos Corridos/i,`${file} ainda contém nomenclatura pública antiga`);
console.log('NO_PINTOS_CORRIDOS_PUBLIC_TEXT=YES');
console.log('PC_ONLY_PUBLIC_NAMING_READY=YES');
