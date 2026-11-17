import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const profile=read('assets/js/app/profile.js');
const css=read('assets/js/app/championship-redesign.css');
const teams=read('assets/js/app/teams.js');
const profileBoot=read('assets/js/app/profile-boot.js');
const historical=read('assets/js/app/club-historical.js');
const season=read('temporada-2026.html');
const publicText=[profile,css,teams,profileBoot,historical,season].join('\n');

assert.doesNotMatch(profile,/claw|tear|tiger-eyes|tiger-reacting/i,'profile.js ainda contém código de garra/olhos artificiais');
assert.doesNotMatch(css,/claw|tear-piece|tear-effects|tear-smoke|tear-particles|organic-cut|tiger-eyes|tiger-smoke|tiger-reacting/i,'CSS ainda contém código exclusivo da garra/olhos artificiais');
assert.match(profile,/login-leaving/,'transição simples do login ausente');
assert.match(css,/login-leave 420ms/,'transição normal deve durar 420ms');
assert.match(css,/animation-duration:120ms/,'reduced motion deve usar saída curta');

for(const asset of ['assets/media/login/smoke-front-01.png']){
  assert.ok(fs.existsSync(path.join(root,asset)),`${asset} ausente`);
}
assert.match(profile,/smoke-front-01/);
assert.doesNotMatch(profile+css,/login-smoke-webgl|WebGLRenderer|ShaderMaterial|smoke-webgl/);
assert.doesNotMatch(css,/smoke-front-one|smoke-front-two|smoke-back-drift/);
assert.match(css,/pointer-events:none/);

assert.match(profile,/placeholder="Como devemos chamar você"/,'placeholder incompleto');
assert.match(css,/profile-form-content>label\{display:grid;gap:10px\}/,'espaço label/input não garantido');
assert.match(css,/min-height:54px;padding:0 16px;line-height:1\.35/,'dimensões do input não garantidas');

assert.doesNotMatch(publicText,/Chereca|other:chereca/i,'Chereca permanece numa superfície pública');
assert.doesNotMatch(publicText,/Pintos Corridos/i,'nomenclatura pública proibida permanece');
for(const id of ['other:jotaventus','other:lurroma']){
  assert.match(profile,new RegExp(id));
  assert.match(teams,new RegExp(id));
  assert.match(profileBoot,new RegExp(id));
}
const publicOtherIds=[...profile.matchAll(/other:(?:jotaventus|lurroma)/g)].map(match=>match[0]);
assert.deepEqual([...new Set(publicOtherIds)].sort(),['other:jotaventus','other:lurroma']);

console.log('CLAW_EFFECT_REMOVED=YES');
console.log('SIMPLE_LOGIN_TRANSITION_READY=YES');
console.log('STATIC_SMOKE_READY=YES');
console.log('TIGER_RED_DOTS_REMOVED=YES');
console.log('LOGIN_NAME_FIELD_FIXED=YES');
console.log('PUBLIC_OTHER_TEAMS=[Jotaventus,Lurroma]');
console.log('NO_PINTOS_CORRIDOS_PUBLIC_TEXT=YES');
