import { dirname,relative,resolve } from 'node:path';
import { FileStorageProvider } from './providers/file-storage-provider.js';
import { validateLogicalPath } from './logical-paths.js';

const providerFor=root=>new FileStorageProvider({root});
const logical=(root,path)=>validateLogicalPath(relative(resolve(root),resolve(path)).replaceAll('\\','/'));
export async function prepareTransaction({root,writes,...input}){const provider=providerFor(root),mapped=writes.map(write=>({...write,path:logical(root,write.path)}));return provider.prepareTransaction({...input,writes:mapped});}
export async function commitTransaction({prepared,root,failurePoint=null}){prepared.failurePoint=failurePoint;return providerFor(root).commitTransaction(prepared);}
export async function markCheckpoint({prepared,checkpointPath,state,eventCount,failurePoint=null}){const provider=providerFor(dirname(dirname(dirname(checkpointPath)))),journal=await provider.readJson(`${prepared.directory}/journal.json`);if(journal.status!=='committed')throw new Error('CHECKPOINT_REQUIRES_COMMITTED_TRANSACTION');const path=logical(provider.root,checkpointPath),checkpoint={schema_version:1,season:journal.season,cartola_round:journal.cartola_round,transaction_id:journal.transaction_id,event_count:eventCount,state_hash:(await import('./storage.js')).hashValue(state),committed_at:journal.committed_at,status:'committed'};await provider.writeJson(path,checkpoint);if(failurePoint==='after_checkpoint_before_return')throw Object.assign(new Error('SIMULATED_FAILURE:after_checkpoint_before_return'),{code:'SIMULATED_FAILURE'});return checkpoint;}
export async function inspectTransactions(rootOrProvider){return typeof rootOrProvider?.inspectTransactions==='function'?rootOrProvider.inspectTransactions():providerFor(rootOrProvider).inspectTransactions();}
