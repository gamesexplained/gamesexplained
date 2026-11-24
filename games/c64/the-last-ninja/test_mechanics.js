'use strict';
// Original code comes from the published listings. Tests cover the ports used by
// the actual pages, plus every generated sprite frame and its PNG pixels.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {CPU}=require('../../../kit/cpu/cpu6502.js'),{create}=require('./reference/ninja-rules.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'reference/mechanics.json'))),rules=create(data);
function listing(slug){const m=new Uint8Array(65536);for(const id of slug==='resident'?['resident']:['resident',slug])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',id,'listing.json'))).records)if(r.b)m.set(r.b,r.a);return m;}
const base=listing('wastelands');let selections=0,steps=0,contacts=0,moves=0,ai=0;
const bits=[1,9,8,10,2,6,4,5],word=(m,a)=>m[a]|m[a+1]<<8;
for(const facing of [1,3,5,7])for(let heading=0;heading<8;heading++)for(let weapon=0;weapon<6;weapon++)for(const mode of ['held','move']){
 const m=new Uint8Array(base);Object.assign(m,{});m[0xb5]=16|bits[heading];m[0xb6]=0;m[0x78]=mode==='held'?16:0;m[0x69]=facing;m[0x6c]=0;m[0x54]=100;m[0x55]=90;m[0x70]=weapon;m[0xa6]=heading;m[0xa8]=255;m[0xa7]=50;m[0x1b]=54;m[0x27b]=250;m[0x6d]=0;m[0x60]=m[0x61]=0;m[0x2b5]=0;
 new CPU(m,{port:0x35}).call(0x5727);const expected=rules.select({facing,heading,weapon,mode});assert.equal(word(m,0x60),expected.pointer,'selection '+[facing,heading,weapon,mode]);assert.equal(m[0x6d],expected.family,'family');selections++;
}
for(const facing of [1,3,5,7])for(let heading=0;heading<8;heading++)for(let mode=0;mode<4;mode++)for(const [x,y,fx,fy] of [[100,90,0,0],[2,80,0,255],[254,100,250,0]]){
 const m=new Uint8Array(base);m[0x54]=x;m[0x55]=y;m[0x50]=fx;m[0x51]=fy;m[0x68]=heading;m[0x69]=facing;m[0x8f]=1;m[0xcb]=0;
 const cpu=new CPU(m,{port:0x35});cpu.call(0x5aac,{}, {hooks:{0x7540(c){m[0x27f]=mode;/* enter after the caller's LDY #0 */c.y=mode;},0x689e(c){c.a=0;c.rts();}}});
 const s=rules.move({x,y,fx,fy,heading,facing},mode);assert.deepEqual([s.x,s.y,s.fx,s.fy],[m[0x54],m[0x55],m[0x50],m[0x51]],'movement '+[facing,heading,mode,x]);moves++;
}
for(const facing of [1,3,5,7])for(let heading=0;heading<8;heading++)for(let weapon=0;weapon<4;weapon++)for(const mode of ['held','move']){
 const params={facing,heading,weapon,mode,x:100,y:90},s=rules.select(params),m=new Uint8Array(base);m[0x54]=100;m[0x55]=90;m[0x50]=m[0x51]=0;m[0x69]=facing;m[0x68]=heading;m[0x70]=weapon;m[0xcb]=0;m[0x8f]=1;
 const cpu=new CPU(m,{port:0x35});cpu.call(0x581b,{a:s.offset});const timeline=rules.timeline(params);
 for(const f of timeline){m[0x64]=0;cpu.call(0x5b69,{}, {hooks:{0x7660(c){c.rts();},0x6ff9(c){c.rts();},0x689e(c){c.a=0;c.rts();}}});assert.deepEqual([f.x,f.y,f.pose,f.pointer,f.remaining,f.event],[m[0x54],m[0x55],m[0x65],word(m,0x60),m[0x58],m[0x64]],'pose step');steps++;}
}
for(const familyBase of [20,24,28,32])for(let face=0;face<4;face++)for(let weapon=0;weapon<4;weapon++)for(const defender of [0,12,16,18,36])for(const closeCount of [0,4])for(const dx of [-3,0,8,16,25,40])for(const dy of [-9,-4,0,5,9]){
 const family=familyBase+face,m=new Uint8Array(base);m[0xcb]=128;m[0x54]=100;m[0x55]=90;m[0x56]=100+(face<2?dx:-dx);m[0x57]=90+dy;m[0x6d]=family;m[0x6f]=defender;m[0x70]=weapon;m[0xd7]=closeCount;
 const cpu=new CPU(m,{port:0x35});cpu.call(0x7ecc,{x:0});const hit=rules.contact({ax:100,ay:90,bx:m[0x56],by:m[0x57],family,defender,weapon,closeCount});assert.equal(hit.hit,cpu.a===255,'contact '+[family,weapon,defender,closeCount,dx,dy]);contacts++;
}
for(let variant=0;variant<4;variant++)for(let random=0;random<256;random++){
 const m=new Uint8Array(base);m[0x72]=variant;m[0x1b]=50;const cpu=new CPU(m,{port:0x35});cpu.call(0x6af8,{}, {hooks:{0x79d2(c){c.a=random;c.rts();}}});assert.equal(m[0xcc],rules.enemyWait(variant,random));
 m[0x6d]=0;m[0x6b]=3;m[0x72]=variant;let offset;cpu.call(0x6ca8,{a:6},{hooks:{0x79d2(c){c.a=random;c.rts();},0xbc63(c){offset=c.x;c.rts();}}});const choice=rules.closeAction(variant,random,0,3);assert.equal(m[0xcf],choice.state);assert.equal(offset,choice.offset);assert.equal(m[0x6f],choice.family);ai++;
}
console.log('PASS:',{selections,moves,steps,contacts,ai});
let targetChecks=0,waitChecks=0,pickupChecks=0,puzzleChecks=0,roomChecks=0;
for(let variant=0;variant<4;variant++)for(const heading of [0,1,2,3,4,5,6,7,255])for(const px of [4,40,140,240,252])for(const ex of [2,40,122,158,253])for(const dy of [-8,0,5]){
 const m=new Uint8Array(base);m[0x54]=px;m[0x55]=90;m[0x56]=ex;m[0x57]=90+dy;m[0x68]=heading;m[0x72]=variant;let close;
 new CPU(m,{port:0x35}).call(0x6b5e,{}, {hooks:{0x6ba1(){close=true;return true;},0x6bc1(){close=false;return true;}}});
 const t=rules.target({px,py:90,ex,ey:90+dy,heading,variant});assert.equal(t.close,close,'target '+[px,ex,heading,variant,dy]);if(!close)assert.equal(t.target,m[0x1e]);targetChecks++;
}
for(const dx of [-8,-7,0,7,8])for(const dy of [-4,-3,0,3,4])for(const count of [0,2,3,4])for(const random of [0,15,31,255])for(const elapsed of [0,15,16,30,31,47,48,260]){
 const m=new Uint8Array(base);m[0x54]=100+dx;m[0x55]=90+dy;m[0x28a]=100;m[0x28b]=90;m[0xd7]=count;m[0xd5]=random;m[0x1b]=200;m[0x276]=(200-elapsed)&255;m[0x6b]=1;let next='wait';
 new CPU(m,{port:0x35}).call(0x6ceb,{a:8},{hooks:{0x6b3c(){next='approach';return true;},0x6cac(){next='close';return true;}}});
 assert.equal(rules.closeWait({px:100+dx,py:90+dy,savedX:100,savedY:90,count,random,elapsed}).next,next);waitChecks++;
}
for(const item of data.items)for(const facing of [1,5])for(const bag of [false,true])for(const holding of [0,6])for(const [x,y] of [[item.bounds[0]+(facing>=4?36:0),item.bounds[2]],[item.bounds[1]+(facing>=4?36:0),item.bounds[2]],[item.bounds[0]+(facing>=4?36:0),item.bounds[3]]]){
 if(x>255)continue;const m=listing(data.slugs[item.chapter]);m.fill(0,0x3ec,0x400);m[0x3ee]=+bag;m[0x279]=holding;m[0x54]=x;m[0x55]=y;m[0x69]=facing;m.set([item.code,...item.bounds],0x27a);m[0xc8]=255;m[0xb1]=m[0x7d]=0;
 const cpu=new CPU(m,{port:0x35});cpu.call(0x5940,{p:0x21},{hooks:{0x63cb(c){c.rts();},0x69dc(c){c.rts();},0x65bf(c){c.rts();},0x7072(c){c.rts();}}});
 const result=rules.pickup({...item,x,y,facing,bag,holding,owned:item.code===2&&bag});const accepted=m[0x3ec+item.code]>0||m[0xb1]===35||m[0x7d]!==0;const expected=['Can collect','Starts the scripted room effect','Activates a hidden effect'].includes(result);assert.equal(accepted,expected||(item.code===2&&bag),'pickup '+[item.chapter,item.code,facing,x,y,bag,holding,result]);if(result==='Selecting the glove is required')assert.equal(m[0xc8],0);pickupChecks++;
}
for(const puzzle of data.puzzles)for(let holding=0;holding<10;holding++)for(let weapon=0;weapon<2;weapon++)for(const facing of [1,3,5,7])for(const owned of [false,true]){
 const m=listing(data.slugs[puzzle.chapter]);m[0x279]=holding;m[0x70]=m[0xd6]=weapon;m[0x69]=facing;m[0x3ed]=+owned;m[0x2b5]=puzzle.action;m[0x334]=20;m[0x335]=30;let accepted=false;
 const hooks={0x583a(){accepted=true;return true;},0x7478(){accepted=true;return true;},0x63cb(c){c.rts();},0x7e00(c){accepted=true;c.rts();}};
 new CPU(m,{port:0x35}).call(puzzle.entry,{a:puzzle.action},{hooks});
 assert.equal(rules.useItem(puzzle,{holding,weapon,facing,flowerOwned:owned}),accepted,'puzzle '+[puzzle.name,holding,weapon,facing,owned]);if(puzzle.consumes&&accepted){assert.equal(m[0x3ed],0);assert.equal(m[0x336],20);assert.equal(m[0x337],30);}puzzleChecks++;
}
for(const item of data.items){const m=listing(data.slugs[item.chapter]);assert.deepEqual([...m.slice(item.address,item.address+10)],[item.room,item.code,...item.bounds,item.sprite,item.flags,item.x,item.y]);roomChecks++;}
console.log('PASS:',{targetChecks,waitChecks,pickupChecks,puzzleChecks,roomChecks});
// This PNG reader deliberately accepts the atlas writer's unfiltered RGBA rows.
function png(file){const b=fs.readFileSync(file);let p=8,width,height,idat=[];while(p<b.length){const n=b.readUInt32BE(p),t=b.toString('ascii',p+4,p+8),v=b.subarray(p+8,p+8+n);if(t==='IHDR'){width=v.readUInt32BE(0);height=v.readUInt32BE(4);assert.equal(v[8],8);assert.equal(v[9],6);}if(t==='IDAT')idat.push(v);p+=n+12;}const bytes=zlib.inflateSync(Buffer.concat(idat)),rows=[];for(let y=0;y<height;y++){const at=y*(width*4+1);assert.equal(bytes[at],0);rows.push(bytes.subarray(at+1,at+1+width*4));}return {width,height,rows};}
const atlas=png(path.join(__dirname,'reference/action-poses.png'));
const palette=['000000','ffffff','813338','75cec8','8e3c97','56ac4d','2e2c9b','edf171','8e5029','553800','c46c71','4a4a4a','7b7b7b','a9ff9f','706deb','b2b2b2'].map(h=>[...Buffer.from(h,'hex')]);
for(const frame of data.poseMeta){
 const m=new Uint8Array(base);m.fill(0,0x200,0x240);m[0x280]=m[0x281]=0;m[0x54]=m[0x56]=100;m[0x55]=m[0x57]=90;m[0x70]=frame.weapon;m[0x72]=0;
 new CPU(m,{port:0x35}).call(frame.opponent?0x7655:0x7660,{a:frame.mirror,y:frame.pose,x:frame.opponent?4:0});
 const pixels=new Uint8Array(128*96*4);
 for(let slot=frame.opponent?4:0;slot<(frame.opponent?8:4);slot++)if(m[0x210+slot]){
  const source=m[0x7e0b+slot]|m[0x7e13+slot]<<8,x=m[0x200+slot]+256*m[0x208+slot]-100+48,y=m[0x210+slot]-90+8,sx=m[0x228+slot]?2:1,sy=m[0x230+slot]?2:1;assert.equal(m[0x238+slot],0);
  for(let yy=0;yy<21;yy++)for(let xx=0;xx<24;xx++)if(m[source+yy*3+(xx>>3)]&(128>>(xx&7)))for(let a=0;a<sy;a++)for(let b=0;b<sx;b++){const at=((y+yy*sy+a)*128+x+xx*sx+b)*4;pixels.set([...palette[m[0x220+slot]&15],255],at);}
 }
 assert.equal(crypto.createHash('sha256').update(pixels).digest('hex'),frame.hash,'native pose '+JSON.stringify(frame));
 const rendered=Buffer.concat(Array.from({length:96},(_,y)=>atlas.rows[Math.floor(frame.index/16)*96+y].subarray(frame.index%16*128*4,(frame.index%16+1)*128*4)));
 assert.deepEqual(rendered,Buffer.from(pixels),'atlas pixels '+frame.index);
}
let landings=0;
for(const h of data.hazards){const initial=listing(data.slugs[h.chapter]);let parsed=[];for(let p=initial[0xdc00+h.index];initial[0xdc00+p]!==255;p+=4)parsed.push([...initial.slice(0xdc00+p,0xdc00+p+4)]);assert.deepEqual(h.rectangles,parsed);
 for(const [l,rr,t,b] of parsed)for(const x of [l-1,l,rr-1,rr])for(const y of [t-1,t,b-1,b]){const m=new Uint8Array(initial);m[0x54]=x;m[0x55]=y;let fail=false;new CPU(m,{port:0x35}).call(h.reader,{x:h.index},{hooks:{[h.reader+47](){fail=true;return true;}}});assert.equal(rules.safe(parsed,x,y),!fail);landings++;}
}
const icons=png(path.join(__dirname,'reference/item-icons.png'));
for(let code=0;code<16;code++){
 const m=new Uint8Array(base);m.fill(0,0xe000,0xf800);m.fill(0,0xc000,0xc400);const io=new Uint8Array(4096);new CPU(m,{port:0x35,io:{read:a=>io[a-0xd000],write:(a,v)=>io[a-0xd000]=v}}).call(0x63cb,{a:code,x:0});const cell=(word(base,0x6527)-0xe000)/8,col=cell%40,row=Math.floor(cell/40),out=[];
 for(let y=0;y<24;y++)for(let x=0;x<64;x++){const c=(row+(y>>3))*40+col+(x>>3),bits=m[0xe000+c*8+(y&7)],ink=m[0xc000+c],colors=[0,ink>>4,ink&15,io[0x800+c]&15];out.push(...palette[colors[(bits>>(6-2*((x&7)>>1)))&3]],255);}
 const image=Buffer.concat(Array.from({length:24},(_,y)=>icons.rows[Math.floor(code/8)*24+y].subarray(code%8*64*4,(code%8+1)*64*4)));assert.deepEqual(image,Buffer.from(out),'inventory icon '+code);
}
// Check every graph edge rather than inferring direction from the diagram's placement.
let edges=0;for(const chapter of data.chapters){const m=listing(chapter.slug);for(const room of chapter.rooms){const record=0x800+8+5*room.slot;assert.equal(room.record,record);assert.equal(room.bytes,Buffer.from(m.slice(record,record+5)).toString('hex').toUpperCase().match(/../g).join(' '));for(const dest of new Set(Object.values(room.exits).flat())){assert([...m.slice(0xaf04+8*room.slot,0xaf08+8*room.slot)].map(x=>x>>2).includes(dest));edges++;}}}
const jump=rules.timeline({facing:1,heading:2,weapon:0,mode:'move',x:103,y:106}).at(-1),near=rules.timeline({facing:1,heading:2,weapon:0,mode:'move',x:104,y:106}).at(-1);assert.deepEqual([jump.x,jump.y,near.x,near.y],[138,106,139,106]);assert(rules.safe(data.hazards[0].rectangles,jump.x,jump.y));assert(!rules.safe(data.hazards[0].rectangles,near.x,near.y));
console.log('PASS:',{nativePoseFrames:data.poseMeta.length,inventoryPictures:16,landingCases:landings,graphEdges:edges});
