import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const catalog=JSON.parse(read('data/catalog/competitions.json')),season=read('assets/js/app/season.js'),css=read('assets/js/app/championship-redesign.css');
const actual=Object.fromEntries(catalog.competitions.map(item=>[item.competition_id,item.public_status]));
assert.deepEqual(actual,{'pl-ios':'active',pc1:'finished',pc2:'active','copa-ios':'finished',iwc:'finished',icwc:'finished'});
assert.match(season,/public_status/);assert.match(season,/competition-status-dot/);assert.match(season,/Em andamento/);assert.match(season,/Encerrado/);
assert.match(css,/competition-status-dot\.active/);assert.match(css,/competition-status-dot\.finished/);assert.match(css,/competition-status-pulse 2\.8s/);assert.match(css,/prefers-reduced-motion:reduce[^}]*\{\.competition-status-dot\.active\{animation:none!important\}/);
console.log('COMPETITION_STATUS_DOTS_READY=YES');console.log('ACTIVE_GREEN_PULSE_READY=YES');console.log('FINISHED_RED_STATUS_READY=YES');
