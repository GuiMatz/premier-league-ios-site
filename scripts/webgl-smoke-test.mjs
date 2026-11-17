import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const profile=read('assets/js/app/profile.js'),css=read('assets/js/app/championship-redesign.css');
assert.equal(fs.existsSync(new URL('../assets/js/app/login-smoke-webgl.js',import.meta.url)),false);
assert.equal(fs.existsSync(new URL('../assets/vendor/three.module.min.js',import.meta.url)),false);
assert.doesNotMatch(profile+css,/WebGL|ShaderMaterial|smoke-webgl|smoke-front-one|smoke-front-two|smoke-back-drift/);
assert.match(profile,/smoke-front-01\.png/);assert.doesNotMatch(profile,/smoke-front-02\.png|smoke-back/);assert.match(css,/mask-image:linear-gradient/);
console.log('STATIC_SMOKE_READY=YES');console.log('WEBGL_LOGIN_REMOVED=YES');
