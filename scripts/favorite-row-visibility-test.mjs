import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../assets/js/app/shared.css',import.meta.url),'utf8');
assert.match(css,/box-shadow:inset 2px 0 var\(--accent\)/);
assert.match(css,/favorite-row> :first-child[^}]*padding-inline-start:16px/);
assert.doesNotMatch(css.slice(css.lastIndexOf('.trophy-image')),/inset 3px 0 var\(--gold\)/);
console.log('FAVORITE_POSITION_VISIBLE=YES');
console.log('FAVORITE_ROW_HIGHLIGHT_READY=YES');
