'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');const m=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/stage-01/listing.json'))).records)if(r.b)m.set(r.b,r.a);
for(const [a,values] of [[0x7f82,[0x5a40,0x9a76,0x9d39,0x9fbc,0xa338,0,0]],[0x7f90,[0x5b28,0x9ba0,0x9dad,0xa04e,0xa448,0,0]],[0x7f9e,[0x5ad8,0x9b32,0x9d89,0xa01c,0xa400,0,0]],[0x7fac,[0x5848,0x9706,0x9c19,0x9e2c,0xa0f8,0,0]]])assert.deepEqual(values.map((_,i)=>m[a+i]+256*m[a+7+i]),values);
console.log('OK - first-load visual-resource pointer tables');
