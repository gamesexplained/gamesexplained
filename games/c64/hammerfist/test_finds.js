'use strict';
// Checks the evidence the pages show for their finds against the committed listings:
// the source text on Discoveries and the routine it assembles to, the docking area's
// doorway list, the YCY patch in every load, and the end-of-load messages and font on
// How it works.
const assert=require('assert'),{game}=require('../../../kit/scripts/port_check.js'),g=game(__dirname);g.lib('cpu6502');
const L=id=>g.listing('parts/'+id+'/listing.json');
const resident=L('resident');
// The source text and the routine at $158A.
const text=Buffer.from(resident.ram.slice(0x1200,0x13de)).toString('latin1');
for(let a=0x1200;a<0x13de;a++)assert(resident.has[a],'source byte '+a.toString(16));
const lines=text.slice(1).split('\r\n');assert.equal(text[0],'\n');assert.equal(lines.length,22);
const page=g.read('discoveries.html'),table=page.match(/<table class="hf-src" id="hf-source">([\s\S]*?)<\/table>/)[1];
const rows=[...table.matchAll(/<tr><td class="lab">(.*?)<\/td><td>(.*?)<\/td><td class="cmt">(.*?)<\/td><td class="gap"><code>\$([0-9A-F]{4})<\/code><\/td><td>(.*?)<\/td>/g)];
assert.equal(rows.length,22);
const un=s=>s.replace(/&amp;/g,'&').replace(/&#x27;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
let a=0x158a;
rows.forEach((r,i)=>{const [lab,op,arg,cmt]=(lines[i].split('\t').concat(['','','','']));assert.equal(un(r[1]),lab);assert.equal(un(r[2]).trim(),(op+' '+arg).trim());assert.equal(un(r[3]),cmt?cmt:'');
 assert.equal(parseInt(r[4],16),a);const bytes=r[5].split(' ').map(h=>parseInt(h,16));assert.deepStrictEqual(bytes,Array.from(resident.ram.slice(a,a+bytes.length)),'routine at '+a.toString(16));
 assert.equal(bytes[0],{LDX:0xa2,LDA:0xbd,STA:0x9d,BEQ:0xf0,BNE:0xd0}[op]===undefined?0xa9:(op==='LDA'&&arg.startsWith('#')?0xa9:{LDX:0xa2,LDA:0xbd,STA:0x9d,BEQ:0xf0,BNE:0xd0}[op]));a+=bytes.length;});
// The docking area's doorway list names rooms 0 to 7 only, and its exit, interaction and object lists leave 8 and 9 empty.
const dock=L('docking-area');const rooms=[];for(let i=0;i<22;i++)rooms.push(dock.ram[0x6547+i*4]);
assert(rooms.every(r=>r<8)&&new Set(rooms).size===8,'docking route rooms '+rooms);
for(const base of [0x6da9,0x6dd0])assert.equal(dock.ram[base+8],dock.ram[base+10],'empty lists for rooms 8 and 9 at '+base.toString(16));
{const w=i=>dock.ram[0x6db6+2*i]|dock.ram[0x6db7+2*i]<<8;assert(w(8)===w(9)&&w(9)===w(10),'empty interaction lists for rooms 8 and 9');}
// YCY: every load checks the initials and turns its own F3 branch from BEQ ($F0) to BNE ($D0).
for(const [id,check,branch] of [['complex-7',0x8330,0x98c1],['docking-area',0x7a30,0x8f30],['load-3',0x7fca,0x94ed],['load-4',0x8336,0x9829]]){
 const m=L(id).ram,b=Array.from(m.slice(check,check+24));
 assert.deepStrictEqual([b[0],b[1],b[12],b[13],b[19],b[20],b[21]],[0xa9,0x59,0xa9,0x43,0xa9,0xd0,0x8d],id);assert.equal(b[22]|b[23]<<8,branch);assert.equal(m[branch],0xf0);}
// How it works: the status font and the messages the four loads print.
const idx=g.read('index.html'),fd=JSON.parse(idx.match(/id="hf-font-data">([\s\S]*?)<\/script>/)[1]);
assert.deepStrictEqual(fd.font,Array.from(resident.ram.slice(0x2000,0x2800)));
['complex-7','docking-area','load-3','load-4'].forEach((id,i)=>{const msg=fd.messages[i],m=L(id).ram;assert.equal(msg.part,id);let at=msg.address;
 for(const line of msg.lines){assert.deepStrictEqual(Array.from(m.slice(at,at+5)),[0xa9,line.colour,0x20,0xf0,0x1c]);const off=m[at+5]|m[at+6]<<8;assert.equal(off,line.row*40+line.col);
  assert.equal(Buffer.from(m.slice(at+7,at+7+line.text.length)).toString('latin1'),line.text);assert.equal(m[at+7+line.text.length],0);at+=7+line.text.length+1;}});
console.log('source text and routine, docking doorways, four YCY checks, font and '+fd.messages.reduce((n,m)=>n+m.lines.length,0)+' message lines match the listings');
