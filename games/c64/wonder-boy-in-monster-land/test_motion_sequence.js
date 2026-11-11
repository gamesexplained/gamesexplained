'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { CPU } = require('../../../kit/cpu/cpu6502.js');
const base = new Uint8Array(65536);
for (const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records) if (r.b) base.set(r.b,r.a);
function run(stream,count,slot=2) {
  const mem=base.slice();mem.set(stream,0x4000);mem[0x54]=0;mem[0x55]=0x40;
  mem[0x1ab1+slot]=0;mem[0x1ac2+slot]=0;mem[0x1ad3+slot]=0;
  const cpu=new CPU(mem),result=[];
  for(let n=0;n<count;n++){cpu.call(0x6a3a,{x:slot});result.push([cpu.a,mem[0x1ab1+slot],mem[0x1ac2+slot]]);}
  return result;
}
assert.deepEqual(run([0x12,0xc1,0xff],3),[[0x12,1,0],[0xc1,2,0],[0xff,3,0]]);
assert.deepEqual(run([0x83,0xfe,0x04],4),[[0xfe,2,2],[0xfe,2,1],[0xfe,2,0],[0x04,3,0]]);
assert.deepEqual(run([0x81,0x23,0x09],2),[[0x23,2,0],[0x09,3,0]]);
assert.deepEqual(run([0x29,0x80],4),[[0x29,1,0],[0x29,1,0],[0x29,1,0],[0x29,1,0]]);
console.log('OK - motion sequence literals, repeats, reset and cached state');
