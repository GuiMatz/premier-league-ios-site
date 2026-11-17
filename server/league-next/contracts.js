export const STORAGE_PROVIDER_CONTRACT=Object.freeze(['readText','readJson','exists','writeText','writeJson','hash','list','getVersion','prepareTransaction','commitTransaction','inspectTransactions']);
export const LOCK_PROVIDER_CONTRACT=Object.freeze(['acquire','renew','release']);
export const ERROR_CODES=Object.freeze({STORAGE_CONFLICT:'STORAGE_CONFLICT',LOCK_CONFLICT:'LOCK_CONFLICT',TRANSACTION_CONFLICT:'TRANSACTION_CONFLICT',WRITER_CONFLICT:'WRITER_CONFLICT'});
export class LeagueStorageError extends Error{constructor(code,message,details={}){super(message);this.name='LeagueStorageError';this.code=code;this.details=details;}}
export function assertStorageProvider(provider){for(const method of STORAGE_PROVIDER_CONTRACT)if(typeof provider?.[method]!=='function')throw new TypeError(`INVALID_STORAGE_PROVIDER:${method}`);return provider;}
export function assertLockProvider(provider){for(const method of LOCK_PROVIDER_CONTRACT)if(typeof provider?.[method]!=='function')throw new TypeError(`INVALID_LOCK_PROVIDER:${method}`);return provider;}
