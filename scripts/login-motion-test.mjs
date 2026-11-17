import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const profile=read('assets/js/app/profile.js'),css=read('assets/js/app/championship-redesign.css');
assert.match(profile,/tiger-login\.png/);assert.match(profile,/smoke-front-01\.png/);assert.match(css,/\.smoke-front\{[^}]*animation:none/);
assert.doesNotMatch(profile+css,/login-smoke-webgl|smoke-webgl|ShaderMaterial|WebGLRenderer|tiger-breathe|pointermove|--tiger-x|--front-x/);
assert.match(css,/login-leave 420ms/);assert.match(profile,/setTimeout\(finish,reduced\?120:420\)/);assert.match(css,/prefers-reduced-motion:reduce/);
assert.doesNotMatch(profile+css,/tiger-eyes|claw|tear-piece|tear-effects/i);
console.log('TIGER_STATIC_READY=YES');console.log('STATIC_SMOKE_READY=YES');console.log('WEBGL_LOGIN_REMOVED=YES');console.log('TIGER_PARALLAX_REMOVED=YES');console.log('SIMPLE_LOGIN_TRANSITION_READY=YES');
