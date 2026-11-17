import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=file=>readFile(new URL(file,root),'utf8');
const publicPages=['index.html','home-page.html','temporada-2026.html','competicao.html','rodadas.html','escalacoes.html','palpites.html','estatisticas.html','times.html','clube.html','historia.html','404.html'];

const css=await read('assets/js/app/championship-redesign.css');
for(const token of ['--bg:','--surface:','--surface-elevated:','--surface-soft:','--text-primary:','--text-secondary:','--text-muted:','--accent:','--accent-soft:','--border:','--shadow-sm:','--shadow-md:','--shadow-lg:','--success:','--danger:','--warning:','--live:','--gold:','--radius-sm:','--radius-md:','--radius-lg:','--radius-xl:','--motion-fast:','--motion-normal:','--motion-slow:'])assert.ok(css.includes(token),`token ausente: ${token}`);
for(const selector of ['.sports-card','.stat-card','.competition-card','.table-shell','.status-pill','.skeleton-card','.empty-state','.error-state','.onboarding-tiger','.claw-transition','.mobile-nav'])assert.ok(css.includes(selector),`componente ausente: ${selector}`);
assert.match(css,/html\[data-color-theme="dark"\]/,'tema escuro ausente');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'reduced motion ausente');

for(const page of publicPages){const html=await read(page);assert.ok(html.includes('championship-redesign.css'),`${page} não carrega o design system`);}
assert.equal(await read('index.html'),await read('home-page.html'),'index e home-page deixaram de ser equivalentes');

const profile=await read('assets/js/app/profile.js');
assert.match(profile,/assets\/media\/login\/tiger-login\.png/,'caminho do tigre fotográfico ausente do onboarding');
assert.doesNotMatch(profile,/createElement\('dialog'\)/,'primeiro acesso não deve ser um modal nativo');
assert.match(profile,/tiger-eyes/,'efeito controlado dos olhos ausente');
assert.match(profile,/<svg viewBox="0 0 1000 1000"/,'cortes SVG ausentes');
assert.match(profile,/claw-transition/,'transição de garra ausente');
assert.match(profile,/prefers-reduced-motion: reduce/,'fallback de movimento reduzido ausente');
assert.doesNotMatch(profile,/lineup|captain|reserva|substitui/i,'profile.js não deve conter lógica de escalação');

console.log('championship-visual-redesign-test: OK');
