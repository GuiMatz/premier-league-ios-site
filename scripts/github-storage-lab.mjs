import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GitHubHttpTransport } from '../server/league-next/github/transport.js';
import { GitHubStorageProvider } from '../server/league-next/providers/github-storage-provider.js';
import { createExecutionContext } from '../server/league-next/execution-context.js';
import { assertProtectedMain,verifyTransaction,verifyLabIntegrity,runNoopValidation,runCasValidation } from '../server/league-next/github/lab-validation.js';

const COMMANDS=['--status','--test-transaction','--verify-transaction','--test-noop','--test-cas'];
const usage={ok:true,status:'HELP',commands:['--status','--verify-transaction --transaction-id <id>','--test-noop','--test-cas','--test-transaction'],safety:{mode:'laboratory',branch:'league-next-lab',root:'data/league-next-lab'}};

export async function runGitHubStorageLab({argv=process.argv.slice(2),env=process.env,stdout=line=>process.stdout.write(`${line}\n`),stderr=line=>process.stderr.write(`${line}\n`),transportFactory=options=>new GitHubHttpTransport(options),providerFactory=options=>new GitHubStorageProvider(options),now=()=>Date.now()}={}){
 const command=argv[0],token=env.GITHUB_TOKEN,repository=env.GITHUB_REPO,branch=env.LEAGUE_GITHUB_BRANCH,root=env.LEAGUE_GITHUB_ROOT||'data/league-next-lab',expectedMainSha=env.LEAGUE_EXPECTED_MAIN_SHA||'28e6b462012f68007e54275ccb17f6435e0550b1',argument=name=>{const index=argv.indexOf(name);return index<0?null:argv[index+1];};
 if(command==='--help'||command==='-h'){stdout(JSON.stringify(usage));return 0;}
 if(!token||!repository||!branch){stdout(JSON.stringify({ok:true,status:'REMOTE_TEST_SKIPPED',reason:'NEW_CREDENTIALS_NOT_CONFIGURED'}));return 0;}
 if(!COMMANDS.includes(command)){stderr(JSON.stringify({ok:false,status:'ERROR',error:{code:'INVALID_COMMAND',message:'Use --help for laboratory commands'}}));return 2;}
 const parts=repository.split('/');if(parts.length!==2||!parts.every(Boolean)){stderr(JSON.stringify({ok:false,status:'ERROR',error:{code:'INVALID_GITHUB_REPOSITORY',message:'GITHUB_REPO must use owner/repo format'}}));return 2;}
 if(branch!=='league-next-lab'||root!=='data/league-next-lab'){stderr(JSON.stringify({ok:false,status:'ERROR',error:{code:'LAB_SCOPE_NOT_ALLOWED',message:'Only league-next-lab and data/league-next-lab are allowed'}}));return 2;}
 let transport=null;
 try{
  transport=transportFactory({token});
  const provider=providerFactory({transport,owner:parts[0],repo:parts[1],branch,allowedBranches:[branch],officialBranches:[env.LEAGUE_OFFICIAL_BRANCH||'main'],root,mode:'laboratory',logger:entry=>stderr(JSON.stringify(entry))}),mainBefore=await assertProtectedMain(transport,{owner:parts[0],repo:parts[1],expectedMainSha});
  if(command==='--status'){const head=await provider.getVersion(),mainAfter=await assertProtectedMain(transport,{owner:parts[0],repo:parts[1],expectedMainSha});stdout(JSON.stringify({ok:true,status:'AVAILABLE',branch,head,main_before:mainBefore,main_after:mainAfter,main_unchanged:mainBefore===mainAfter}));return 0;}
  if(command==='--verify-transaction'){const transactionId=argument('--transaction-id')||env.LEAGUE_TRANSACTION_ID;if(!transactionId)throw Object.assign(new Error('Transaction id is required'),{code:'TRANSACTION_ID_REQUIRED'});const verification=await verifyTransaction(provider,transactionId),integrity=await verifyLabIntegrity(provider),mainAfter=await assertProtectedMain(transport,{owner:parts[0],repo:parts[1],expectedMainSha});stdout(JSON.stringify({...verification,integrity,main_before:mainBefore,main_after:mainAfter,main_unchanged:mainBefore===mainAfter}));return verification.ok&&integrity.status==='OK'?0:1;}
  if(command==='--test-noop'){const result=await runNoopValidation(provider,{runId:`noop-real-${now()}`}),integrity=await verifyLabIntegrity(provider),mainAfter=await assertProtectedMain(transport,{owner:parts[0],repo:parts[1],expectedMainSha});stdout(JSON.stringify({...result,integrity,main_before:mainBefore,main_after:mainAfter,main_unchanged:mainBefore===mainAfter}));return result.ok&&integrity.status==='OK'?0:1;}
  if(command==='--test-cas'){const result=await runCasValidation(provider,{runId:`cas-real-${now()}`}),integrity=await verifyLabIntegrity(provider),mainAfter=await assertProtectedMain(transport,{owner:parts[0],repo:parts[1],expectedMainSha}),mainUnchanged=mainBefore===mainAfter,ok=result.winner_status==='COMMITTED'&&result.loser_status==='STORAGE_CONFLICT'&&result.final_head===result.winner_head&&result.conflicting_commit_reachable===false&&mainUnchanged&&integrity.status==='OK';stdout(JSON.stringify({...result,ok,integrity,main_before:mainBefore,main_after:mainAfter,main_unchanged:mainUnchanged}));return ok?0:1;}
  const runId=`manual-lab-${now()}`,context=createExecutionContext({run_id:runId,environment:'laboratory',writer:'bot',season:2099,cartola_round:1,operation:'provider-test',dry_run:true,shadow:true}),expectedVersion=await provider.getVersion(),path=`lab-tests/${runId}/probe.json`,prepared=await provider.prepareTransaction({season:2099,round:1,operation:'provider-test',writes:[{path,data:{schema_version:1,kind:'laboratory_probe',run_id:runId}}],checkpoint:{path:`lab-tests/${runId}/checkpoint.json`,state:{probe:true},eventCount:0},expectedVersion,executionContext:context}),result=await provider.commitTransaction(prepared);
  if(result.status!=='committed'){stdout(JSON.stringify({ok:false,status:result.status,code:result.code||null}));return 1;}const roundTrip=await provider.readJson(path),mainAfter=await assertProtectedMain(transport,{owner:parts[0],repo:parts[1],expectedMainSha});stdout(JSON.stringify({ok:true,status:result.result,transaction_id:prepared.transaction_id,head:result.head,round_trip:roundTrip?.kind==='laboratory_probe',main_before:mainBefore,main_after:mainAfter,main_unchanged:mainBefore===mainAfter}));return 0;
 }catch(error){stderr(JSON.stringify({ok:false,status:'ERROR',error:{code:error.code||'REMOTE_OPERATION_FAILED',message:safeText(error.message,token),diagnostic:safeDiagnostic(error.diagnostic,token)}}));return 1;
 }finally{if(transport&&typeof transport.close==='function')await transport.close();}
}

const isDirect=process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url));
if(isDirect)process.exitCode=await runGitHubStorageLab();
function safeText(value,token){let text=String(value||'Remote operation failed');if(token)text=text.split(token).join('[REDACTED]');return text.replace(/Bearer\s+\S+/gi,'Bearer [REDACTED]').replace(/gh[pousr]_[A-Za-z0-9]+/g,'[REDACTED]').slice(0,300);}
function safeDiagnostic(value,token){if(!value||typeof value!=='object')return null;return Object.fromEntries(['name','code','message'].filter(key=>value[key]!=null).map(key=>[key,safeText(value[key],token)]));}
