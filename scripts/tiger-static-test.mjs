import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [css,profile]=await Promise.all([
  readFile(new URL('../assets/js/app/championship-redesign.css',import.meta.url),'utf8'),
  readFile(new URL('../assets/js/app/profile.js',import.meta.url),'utf8')
]);

assert.match(css,/\.profile-dialog:not\(\.profile-editing\) \.onboarding-visual,\.profile-dialog:not\(\.profile-editing\) \.onboarding-tiger\{animation:none!important;transition:none!important\}/);
assert.match(css,/\.onboarding-tiger:hover,\.profile-dialog:not\(\.profile-editing\):focus-within \.onboarding-tiger\{animation:none!important;transition:none!important\}/);
assert.match(css,/@keyframes login-static-fade\{to\{opacity:0;visibility:hidden\}\}/);
assert.match(css,/\.profile-dialog\.login-leaving\{animation:login-static-fade 420ms[^}]*transform:none!important\}/);
assert.match(css,/\.profile-dialog\.login-leaving:not\(\.profile-editing\) \.profile-form-content\{transform:none!important;opacity:0;transition:opacity 320ms ease!important\}/);
assert.doesNotMatch(profile,/pointermove|mousemove|requestAnimationFrame|style\.transform|\.style\[['"]transform['"]\]/i);
assert.doesNotMatch(profile,/classList\.[^(]+\([^)]*(?:parallax|tiger-(?:idle|motion)|motion-tiger)/i);

const finalLock=css.lastIndexOf('Correção final: o asset');
const lastTigerAnimation=css.lastIndexOf('animation:tiger-');
assert.ok(finalLock>lastTigerAnimation,'a trava estática deve prevalecer sobre animações legadas');

console.log('tiger-static-test: ok');
