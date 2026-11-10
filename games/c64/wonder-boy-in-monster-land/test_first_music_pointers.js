'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const m=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/stage-01/listing.json'))).records)if(r.b)m.set(r.b,r.a);
function pointers(a){const p=[];for(let i=0;i<40;i++){const lo=m[a+i*2];if(!lo)return p;p.push(lo+256*m[a+i*2+1]);}throw Error('missing terminator');}
assert.deepEqual(pointers(0xb023),[0xb0c3]);assert.deepEqual(pointers(0xb027),[0xb134,0xb134,0xb134,0xb134,0xb13f,0xb13f,0xb134,0xb134,0xb149,0xb159]);
console.log('OK - first-load second and third voice pattern-pointer lists');
