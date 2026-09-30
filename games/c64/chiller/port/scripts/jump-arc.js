'use strict';
// The picture of one jump for How it works (reference/jump-arc.png): the port in the forest, up and
// right, the take-off, the top and the landing drawn over the screen, a dot a frame at his feet.
// node scripts/jump-arc.js ../reference/jump-arc.png
const path = require('path'), R = path.resolve(__dirname, '..') + '/';
for (const f of ['kernal','core','g-fabric','g-player','g-energy','g-enemies','g-screens','screen','runtime']) require(R+'src/'+f+'.js');
require(path.resolve(__dirname, '../../../../../site/lib/c64.js'));
const { boot } = require(R+'machine.js'); const { png } = require(R+'shot.js'); const cost=require(R+'cost.json'), FRAME=63*312;
const rgb = C64.PAL.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
const rt=ChillerRuntime.create(boot().ram,{cost}); rt.cheats.energy=true; rt.cheats.ghosts=true;
rt.jump(0); rt.busy=true; while (rt.busy) rt.runTo(rt.cycles+FRAME);
rt.chips.joy=0x1F; for (let i=0;i<20;i++) rt.runTo(rt.cycles+FRAME);
const W=384,H=272, draw=(vic)=>ChillerScreen.draw(rt.M, vic, rt.chips.colour, new Uint8Array(W*H));
const shots=[]; const snap=()=>{ const v=rt.chips.vic.slice(); const ptr=rt.M[0x7F8]; shots.push({v, ptr, mem: rt.M.slice(0x3000,0x4000)}); };
snap(); rt.chips.joy=0x16;
for (let f=0; f<75; f++) { rt.runTo(rt.cycles+FRAME); if (f===2) rt.chips.joy=0x1F; snap(); }
const bgv=shots[0].v.slice(); bgv[0x15]=0; const bg=draw(bgv);
const out=new Float32Array(W*H*3); for (let i=0;i<W*H;i++) for (let k=0;k<3;k++) out[i*3+k]=rgb[bg[i]][k];
// the take-off, the top and the landing, solid; the path of his feet as dots, one a frame
let top=0; shots.forEach((s,i)=>{ if (s.v[1]<shots[top].v[1]) top=i; });
let land=shots.length-1; for (let i=top;i<shots.length;i++) if (shots[i].v[1]>=shots[0].v[1]) { land=i; break; }
const pick=[0, top, land];
console.log('frames: top', top, 'land', land, 'y', shots[0].v[1], shots[top].v[1], shots[land].v[1], 'x', shots[0].v[0], shots[land].v[0]);
for (const [n,i] of pick.entries()) {
  const s=shots[i], v=s.v.slice(); v[0x15]=1; const save=rt.M.slice(0x3000,0x4000); rt.M.set(s.mem,0x3000); rt.M[0x7F8]=s.ptr;
  const px=draw(v); rt.M.set(save,0x3000);
  const a = 1;
  for (let p=0;p<W*H;p++) if (px[p]!==bg[p]) for (let k=0;k<3;k++) out[p*3+k]=out[p*3+k]*(1-a)+rgb[px[p]][k]*a;
}
for (let i=0;i<=land;i++) { const s=shots[i], x=s.v[0]+8+12, y=s.v[1]+1+21-16; if (y>=0&&y<H) { const p=(y*W+x)*3; out[p]=out[p+1]=out[p+2]=255; } }
shots.length=land+1;
// crop around the path, scaled 3x
const xs=shots.map(s=>s.v[0]+8), ys=shots.map(s=>s.v[1]-15);
const x0=Math.max(0,Math.min(...xs)-24), x1=Math.min(W,Math.max(...xs)+24+24), y0=Math.max(0,Math.min(...ys)-16), y1=Math.min(H,Math.max(...ys)+21+12);
const SC=3, cw=(x1-x0)*SC, ch=(y1-y0)*SC, img=new Uint8Array(cw*ch*4);
for (let y=0;y<ch;y++) for (let x=0;x<cw;x++) { const p=((y0+Math.floor(y/SC))*W+x0+Math.floor(x/SC))*3; img.set([out[p],out[p+1],out[p+2],255],(y*cw+x)*4); }
png(process.argv[2], cw, ch, img);
console.log(cw, ch, 'x', x0, x1, 'y', y0, y1, 'exposures', pick.length);
