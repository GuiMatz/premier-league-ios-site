import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const walk = dir => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});

const jsFiles = walk(root).filter(path => path.endsWith('.js') || path.endsWith('.mjs'));
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(`${relative(root, file)}\n${result.stderr}\n`);
    process.exit(1);
  }
}

// Garantias de segurança do código que roda no navegador: o frontend nunca
// conversa direto com o upstream do Cartola nem guarda credenciais.
const browserCode = walk(join(root, 'assets', 'js'))
  .filter(path => path.endsWith('.js'))
  .map(path => readFileSync(path, 'utf8'))
  .join('\n');

const checks = [
  [!browserCode.includes('api.cartola.globo.com'), 'frontend conhece o upstream do Cartola'],
  [!browserCode.includes('goidc.globo.com'), 'OAuth experimental ainda está no frontend'],
  [!browserCode.includes('cartola_access_token'), 'token do Cartola ainda é persistido no navegador'],
  [!browserCode.includes('allorigins'), 'proxy CORS público ainda está presente']
];

for (const [ok, message] of checks) {
  if (!ok) {
    console.error(message);
    process.exit(1);
  }
}

console.log(`OK: ${jsFiles.length} arquivos JavaScript verificados.`);
