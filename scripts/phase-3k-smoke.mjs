import assert from 'node:assert/strict';
const base=process.env.PREVIEW_URL;
if(!base)throw new Error('PREVIEW_URL_REQUIRED');
const url=new URL(base);assert.equal(url.protocol,'https:');
const routes=['/','/temporada','/rodadas','/escalacoes','/times','/estatisticas','/historia','/api/league/health','/api/league/status'];
for(const route of routes){const response=await fetch(new URL(route,url),{redirect:'follow',headers:{Accept:route.startsWith('/api/')?'application/json':'text/html'}});if(!response.ok)throw new Error(`SMOKE_FAILED ${route} HTTP_${response.status}`);if(route.startsWith('/api/')){const body=await response.json();assert.equal(body.ok,true,route);}else{const body=await response.text();assert.ok(body.includes('<html'),route);}}
console.log(JSON.stringify({ok:true,status:'PREVIEW_SMOKE_OK',routes:routes.length,origin:url.origin}));
