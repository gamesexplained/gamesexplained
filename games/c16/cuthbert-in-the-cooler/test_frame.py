#!/usr/bin/env python3
"""Compare the published rebuilt screen with the frozen plus4emu reference, pixel by pixel."""
from pathlib import Path
import subprocess
import sys
import tempfile

GAME=Path(__file__).resolve().parent
ROOT=GAME.parents[2]
sys.path.insert(0,str(ROOT/'kit/c16'))
from frame import png_rgb

script=r'''
const fs=require('fs'),path=require('path');
const [root,game,out]=process.argv.slice(1);
require(path.join(root,'site/lib/c16.js'));
const D=require(path.join(game,'reference/cooler-data.js'));
const F=require(path.join(game,'reference/frame-data.js'));
const m=new Uint8Array(65536);
m.set(D.font,0x3800);m.set(F.screen,0xc00);m.set(F.attributes,0x800);
for(const [a,b]of F.patches)m.set(b,a);
const image=C16.render(m,Uint8Array.from(F.ted));
if(image.w!==320||image.h!==200)throw new Error('unexpected display size');
fs.writeFileSync(out,Buffer.from(C16.rgba(image)));
'''
with tempfile.TemporaryDirectory() as tmp:
    out=Path(tmp)/'rgba'
    subprocess.run(['node','-e',script,str(ROOT),str(GAME),str(out)],check=True)
    rgba=out.read_bytes()
w,h,reference=png_rgb(str(GAME/'reference/rebuilt-frame.png'))
assert (w,h)==(384,294),(w,h)
different=0
for y in range(200):
    for x in range(320):
        p=(y*320+x)*4
        if tuple(rgba[p:p+3])!=reference[(y+47)*w+x+32]:different+=1
assert different==0,f'{different} display pixels differ from plus4emu'
print('OK — rebuilt screen matches plus4emu: 0 of 64,000 display pixels differ')
