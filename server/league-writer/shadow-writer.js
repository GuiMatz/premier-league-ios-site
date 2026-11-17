import { mkdir,writeFile,rename } from 'node:fs/promises';
import { dirname,resolve,sep,join } from 'node:path';

const forbidden=()=>{throw Object.assign(new Error('SHADOW_WRITE_FORBIDDEN'),{code:'SHADOW_WRITE_FORBIDDEN'});};
export class ShadowWriter{
 constructor({projectRoot,root='reports/shadow-writer'}={}){const base=resolve(projectRoot),target=resolve(base,root),allowed=resolve(base,'reports','shadow-writer'),temporary=resolve(base,'tmp','shadow-writer');if(![allowed,temporary].some(entry=>target===entry||target.startsWith(entry+sep)))throw Object.assign(new Error('SHADOW_WRITER_PATH_FORBIDDEN'),{code:'SHADOW_WRITER_PATH_FORBIDDEN'});this.root=target;this.mode='shadow_writer';}
 async serialize(candidate,{name='transaction-candidate.json'}={}){if(candidate?.mode!=='shadow_writer'||candidate?.committable!==false)throw Object.assign(new Error('INVALID_SHADOW_CANDIDATE'),{code:'INVALID_SHADOW_CANDIDATE'});const dir=join(this.root,String(candidate.journal.season),`R${String(candidate.journal.cartola_round).padStart(2,'0')}`),target=join(dir,name),temp=`${target}.${process.pid}.tmp`;await mkdir(dirname(target),{recursive:true});await writeFile(temp,`${JSON.stringify(candidate,null,2)}\n`,'utf8');await rename(temp,target);return{status:'DRY_RUN_SERIALIZED',path:target,transaction_id:candidate.transaction_id};}
 async commit(){forbidden();}async publish(){forbidden();}async writeOfficial(){forbidden();}async commitTransaction(){forbidden();}
}
