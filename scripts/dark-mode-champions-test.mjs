import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const pages=['index.html','home-page.html','temporada-2026.html','rodadas.html','escalacoes.html','palpites.html','estatisticas.html','times.html','clube.html','competicao.html','confronto.html','copa-ios.html','historia.html'];
const boot=read('assets/js/app/theme-boot.js');
const css=read('assets/js/app/theme.css');
const season=read('assets/js/app/season.js');
const clubs=JSON.parse(read('data/catalog/clubs.json')).clubs;

for(const page of pages){
  const html=read(page),head=html.slice(0,html.indexOf('</head>'));
  assert.match(head,/theme\.css/,`${page} não carrega a camada compartilhada de tema`);
  assert.match(head,/theme-boot\.js/,`${page} não aplica o tema no head`);
}
assert.match(boot,/plios\.theme\.v1/,'chave de persistência ausente');
assert.match(boot,/localStorage\.getItem/,'preferência não restaurada de modo síncrono');
assert.match(boot,/localStorage\.setItem/,'preferência não persistida');
assert.match(boot,/window\.addEventListener\('storage'/,'sincronização entre abas ausente');
assert.match(boot,/return 'light'/,'modo claro precisa ser o padrão');
assert.doesNotMatch(boot,/fetch\(|\/api\//,'tema não pode depender do backend');
assert.match(css,/html\[data-color-theme="dark"\]/,'tokens de modo escuro ausentes');
assert.match(css,/--table-head:/,'token de cabeçalho de tabela ausente');
assert.match(css,/--table-row-alt:/,'token de alternância de linhas ausente');
assert.match(css,/safe-area-inset-bottom/,'toggle móvel não respeita safe area');
assert.match(css,/--bottom-nav-height/,'toggle móvel não reserva a bottom nav');
assert.match(css,/prefers-reduced-motion/,'redução de movimento ausente');
assert.doesNotMatch(css,/filter\s*:\s*invert/i,'logos não podem ser invertidos');
assert.match(css,/predict-state="open"/,'estado aberto de Palpites perdeu o destaque');
assert.match(css,/\.rules-button/,'contraste do botão de ajuda não foi tratado');

const expected=[[2023,10000007,'Easy Money Sn1per'],[2024,10000001,'Shaktar Meminetsk'],[2025,10000003,'ValeGuiDoce']];
for(const [year,id,name] of expected){
  const found=clubs.find(club=>Number(club.team_id)===id);
  assert.ok(found,`clube campeão ${id} não existe no catálogo`);
  assert.ok([found.official_name,found.short_name].includes(name)||season.includes(`name:'${name}'`),`nome conhecido divergente para ${id}`);
  assert.match(season,new RegExp(`year:${year},id:${id},name:'${name}'`),`campeão ${name} ausente da faixa histórica`);
}
assert.match(season,/2026[\s\S]{0,120}Em andamento/,'2026 deve permanecer em andamento');
assert.match(season,/id==='pl-ios'\?plChampions\(store\)/,'faixa de campeões deve aparecer somente na PL IOS');
assert.doesNotMatch(season,/pl-ios-2023|pl-ios-2024|pl-ios-2025/,'não criar classificação histórica fictícia');

console.log('dark-mode-champions-test: ok');
