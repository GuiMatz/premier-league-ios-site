// Executa a suíte de regressão offline (motor da liga, API de leitura,
// projeções de estatísticas, componentes do frontend e acessibilidade).
// Nenhum teste desta lista acessa a rede: provedores remotos usam transportes simulados.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const SUITE = [
  'check.mjs', 'state-test.mjs', 'smoke.mjs',
  'league-engine-test.mjs', 'integrity-test.mjs', 'records-rollover-test.mjs', 'round-rollover-test.mjs',
  'phase-3c-test.mjs', 'phase-3d-test.mjs', 'phase-3d1-test.mjs', 'phase-3d2-test.mjs', 'phase-3e-test.mjs',
  'phase-3f-test.mjs', 'phase-3f1-test.mjs', 'phase-3f2-test.mjs', 'phase-3g-test.mjs', 'phase-3h-test.mjs',
  'phase-3h1-test.mjs', 'phase-3h2-test.mjs', 'phase-3i-test.mjs', 'phase-3i1-test.mjs', 'phase-3i2-test.mjs',
  'phase-3k2-test.mjs',
  'competition-status-dots-test.mjs', 'favorite-row-visibility-test.mjs', 'frontend-refresh-test.mjs',
  'home-accessibility-polish-test.mjs', 'home-effective-score-test.mjs', 'home-latest-mvp-test.mjs',
  'integrated-live-home-test.mjs', 'lineup-effective-score-test.mjs', 'login-motion-test.mjs',
  'login-smoke-public-naming-test.mjs', 'navigation-performance-test.mjs', 'public-pc-naming-test.mjs',
  'public-ux-club-profiles-test.mjs', 'rl-bench-presentation-test.mjs', 'round-statistics-lineups-test.mjs',
  'theme-default-test.mjs', 'tiger-static-test.mjs', 'webgl-smoke-test.mjs'
];

let failed = 0;
for (const file of SUITE) {
  const result = spawnSync(process.execPath, [`scripts/${file}`], { cwd: root, encoding: 'utf8' });
  if (result.status === 0) {
    console.log(`ok   ${file}`);
  } else {
    failed++;
    console.log(`FAIL ${file}`);
    process.stderr.write(`${result.stderr || result.stdout}\n`);
  }
}

console.log(`\n${SUITE.length - failed}/${SUITE.length} verificações passaram.`);
process.exit(failed ? 1 : 0);
