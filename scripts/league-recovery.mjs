import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leagueRoot } from '../server/league-next/storage.js';
import { FileStorageProvider } from '../server/league-next/providers/file-storage-provider.js';
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);if(!args.includes('--inspect'))throw new Error('Somente --inspect é suportado nesta fase');const index=args.indexOf('--root'),root=leagueRoot(projectRoot,index>=0?args[index+1]:'data/league-next'),provider=new FileStorageProvider({root}),transactions=await provider.inspectTransactions();console.log(JSON.stringify({mode:'inspect_only',provider:provider.kind,repairs_executed:false,transactions,summary:Object.fromEntries(['NO_ACTION','COMPLETE_COMMIT','ROLLBACK','MANUAL_REVIEW'].map(status=>[status,transactions.filter(t=>t.classification===status).length]))},null,2));
