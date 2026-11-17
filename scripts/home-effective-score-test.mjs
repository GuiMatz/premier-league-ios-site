import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {selectCurrentTeamScore,selectTeamScores} from '../assets/js/app/current-team-score.js';

const root=path.resolve(import.meta.dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const partial={teamId:10000001,round:24,effectiveScore:null,projectedScore:115.64,officialScore:79.67,officialIsAuthoritative:false};
const selected=selectCurrentTeamScore(partial,{roundFinal:false});
assert.equal(selected.value,partial.projectedScore);assert.notEqual(selected.value,partial.officialScore);assert.equal(selected.source,'effective_projection');
const complete={...partial,officialIsAuthoritative:true};assert.equal(selectCurrentTeamScore(complete,{roundFinal:true}).value,partial.officialScore);
assert.equal(selectCurrentTeamScore({effectiveScore:null,projectedScore:null,officialScore:null},{lastTrusted:{value:101.25}}).value,101.25);
assert.equal(selectCurrentTeamScore({effectiveScore:0,projectedScore:10,officialScore:null}).value,0,'zero efetivo é válido e não equivale a null');
const map=selectTeamScores({10000001:partial});assert.equal(map[10000001].value,selected.value);

const home=read('assets/js/app/home.js'),lineups=read('assets/js/app/lineups.js'),rounds=read('assets/js/app/rounds.js');
assert.match(home,/selectTeamScores/);assert.doesNotMatch(home,/stats\[0\]\.textContent=favorite\?\(live\?\.roundPoints/);
assert.match(lineups,/selectCurrentTeamScore/);assert.match(lineups,/teamHighlight'\)\.textContent=currentScore/);assert.doesNotMatch(lineups,/Total retornado pelo Cartola \(parcial\)/);
assert.match(rounds,/selectTeamScores/);assert.doesNotMatch(rounds,/roundPoints:Number\(value\.projectedScore\)/);
console.log('home-effective-score-test: ok');
