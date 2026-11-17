import { readFile } from 'node:fs/promises';
const storage = new Map();
globalThis.localStorage = { getItem:k=>storage.get(k)??null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:k=>storage.delete(k) };
const { appState, applyPublicState, getResultados } = await import('../assets/js/state.js');
const state = JSON.parse(await readFile(new URL('../data/state_public.json', import.meta.url), 'utf8'));
applyPublicState(state);
const results = getResultados();
if (!results[1] || !results[18]) throw new Error('resultados históricos não foram carregados');
const cartolaRound = Number(state.rodada);
if (!Number.isInteger(cartolaRound) || cartolaRound < 19 || cartolaRound > 36) {
  throw new Error(`rodada do Cartola fora do intervalo mapeado: ${state.rodada}`);
}
const expectedPc2Round = cartolaRound - 18;
if (Number(state.pc2_round) !== expectedPc2Round) {
  throw new Error(`mapeamento Cartola/PC/2 inválido: R${cartolaRound} deveria corresponder a R${expectedPc2Round}`);
}
if (appState.round !== expectedPc2Round) {
  throw new Error(`rodada do PC/2 inválida: ${appState.round}; esperada: ${expectedPc2Round}`);
}
if (appState.round === cartolaRound) throw new Error('rodada do PC/2 foi confundida com a rodada do Cartola');
if (!appState.publicUpdatedAt) throw new Error('updated_at não foi aplicado');
console.log('OK: state público aplicado sem misturar a rodada do Cartola com a rodada da competição.');
