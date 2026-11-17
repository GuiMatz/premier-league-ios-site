import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [home,profile,shared]=await Promise.all([
  readFile(new URL('../home-page.html',import.meta.url),'utf8'),
  readFile(new URL('../assets/js/app/profile.js',import.meta.url),'utf8'),
  readFile(new URL('../assets/js/app/shared.css',import.meta.url),'utf8')
]);

assert.match(home,/class="skip-link" href="#inicio">Pular para o conteúdo principal/);
assert.match(home,/<main[^>]+id="inicio"[^>]+tabindex="-1"/);
assert.equal((home.match(/<th scope="col">/g)||[]).length,5);
assert.match(home,/id="homeStandings"[^>]+aria-busy="true"[^>]+aria-live="polite"/);
assert.match(home,/data-od-id="latest-events"[^>]+aria-busy="true"[^>]+aria-live="polite"/);
assert.match(home,/@media\(max-width:420px\)/);
assert.match(profile,/name="name"[^>]+required[^>]+aria-describedby="profileLocalError"/);
assert.match(profile,/id="profileLocalError" role="alert" aria-live="polite"/);
assert.match(profile,/setAttribute\('aria-invalid'/);
assert.match(profile,/name="favoriteTeamId"[^>]+required[^>]+aria-describedby="profileLocalError"/);
assert.match(shared,/input\[aria-invalid="true"\]/);

console.log('home-accessibility-polish-test: ok');
