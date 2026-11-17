const branch=String(process.argv[2]||'');
if(!/(^|[-_/])lab(oratory)?($|[-_/])/i.test(branch)||['main','master','production','prod'].includes(branch.toLowerCase())){console.error(JSON.stringify({ok:false,status:'BRANCH_NOT_ALLOWED'}));process.exit(1);}
console.log(JSON.stringify({ok:true,status:'LABORATORY_BRANCH_ALLOWED',branch}));
