import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../assets/js/app/theme-boot.js',import.meta.url),'utf8');
function boot(saved){
  const storage=new Map(saved==null?[]:[['plios.theme.v1',saved]]),listeners={};let mounted=null;
  const root={dataset:{},style:{}},document={documentElement:root,readyState:'complete',body:{appendChild(node){mounted=node;}},getElementById(){return mounted;},createElement(){return{className:'',dataset:{},setAttribute(){},addEventListener(type,fn){this[type]=fn;}}}};
  const localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,value)};
  const window={addEventListener(type,fn){listeners[type]=fn;}};
  vm.runInNewContext(source,{document,localStorage,window});
  return{root,storage,button:mounted};
}
assert.equal(boot(null).root.dataset.colorTheme,'dark');
assert.equal(boot('dark').root.dataset.colorTheme,'dark');
assert.equal(boot('light').root.dataset.colorTheme,'light');
const dark=boot('dark');dark.button.click();assert.equal(dark.storage.get('plios.theme.v1'),'light');assert.equal(boot(dark.storage.get('plios.theme.v1')).root.dataset.colorTheme,'light');
const light=boot('light');light.button.click();assert.equal(light.storage.get('plios.theme.v1'),'dark');assert.equal(boot(light.storage.get('plios.theme.v1')).root.dataset.colorTheme,'dark');
assert.match(source,/paint\(savedTheme\(\),false\)/);assert.match(source,/return saved==='light'\?'light':'dark'/);
console.log('theme-default-test: OK');
