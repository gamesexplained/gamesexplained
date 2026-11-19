'use strict';
// Each screen the Graphics tab draws is rebuilt by the game's own loader ($7119) for every load and visual
// selector that shows it. Every character the screen uses either lies in a run of the selector's character copy,
// whose note says that this screen draws it, or inside another structure the copy sweeps up, which that
// structure's own note explains. The continue screen is the resident part's own ($5B28), the same in every load.
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js'),root=__dirname,parts=path.join(root,'parts');const html=fs.readFileSync(path.join(root,'graphics.html'),'utf8'),data=JSON.parse(html.match(/<script id="visual-resource-data" type="application\/json">([^<]+)<\/script>/)[1]);function read(p,f){return JSON.parse(fs.readFileSync(path.join(parts,p,f)))}const base=new Uint8Array(65536);for(const r of read('resident','listing.json').records)if(r.b)base.set(r.b,r.a);
const hex2=v=>v.toString(16).toUpperCase().padStart(2,'0'),hex4=v=>v.toString(16).toUpperCase().padStart(4,'0');
function drawn(clause){const out=new Set();for(const m of clause.matchAll(/\$([0-9A-F]{2})(?:–\$([0-9A-F]{2}))?/g)){const a=parseInt(m[1],16),b=parseInt(m[2]||m[1],16);for(let g=a;g<=b;g++)out.add(g)}return out}
let named=0,others=0,partial=0,screens=0;
for(const o of data){const matches=o.owner==='resident'?[[o.load,o.selector]]:o.matches;for(const [load,selector] of matches){const part=o.owner==='resident'?'resident':'stage-'+String(load).padStart(2,'0'),notes=read(part,'symbols.json').comments.filter(c=>c.type==='line').sort((a,b)=>a.address-b.address);const m=base.slice();for(const r of read('stage-'+String(load).padStart(2,'0'),'listing.json').records)if(r.b)m.set(r.b,r.a);const source=m.slice(),src=source[0x7fac+selector]+256*source[0x7fb3+selector];m[0x46]=0xc4;m[0x4d71]=0xc8;m[0x4d8a]=0;new CPU(m).call(0x7119,{x:selector},{maxSteps:500000});screens++;
 const who=o.owner==='resident'?'The screen at $5B28, through the metatiles at $5A40,':`Screen ${o.number}, from visual selector ${selector},`;
 for(const g of [...new Set(o.screen)].sort((a,b)=>a-b)){const a=src+8*g;assert.deepEqual([...m.slice(0xd000+g*8,0xd008+g*8)],[...source.slice(a,a+8)],`load ${load} selector ${selector} glyph $${hex2(g)}`);
  const c=notes.filter(x=>x.address<=a).at(-1);assert(c,`load ${load} $${hex4(a)}`);
  const run=c.text.match(/^(?:Load \d+|Resident): (?:characters?|bytes?) [^ ]+ of the eight-page character copy for (?:load \d+'s )?visual selector (\d+), which starts at \$([0-9A-F]{4})/);
  if(run&&Number(run[1])===selector&&parseInt(run[2],16)===src){const at=c.text.indexOf(who);if(at<0){partial++;continue}const clause=c.text.slice(at+who.length).split('.')[0];assert(clause.includes('every one of them')||drawn(clause).has(g),`load ${load} $${hex4(c.address)} glyph $${hex2(g)}`);named++}else others++}}}
assert.equal(named,4833);console.log(`OK - ${screens} screen rebuilds: ${named} characters named in their copy's runs, ${others} inside other structures, ${partial} in runs that name no screen`);
