#!/usr/bin/env python3
"""Check the carried type-$01 handlers against their source copy."""
import json
from pathlib import Path
root=Path(__file__).parent/'parts'
def image(n):
 m=bytearray(65536)
 for r in json.loads((root/f'stage-{n:02d}/listing.json').read_text())['records']:
  if r.get('b'):m[r['a']:r['a']+len(r['b'])]=bytes(r['b'])
 return m
source=image(2);s=0xb97e
for n,d in [(3,0x98c5),(13,0x91da),(14,0xa038),(15,0xa492),(17,0x9a89),(19,0xb765),(26,0xa738)]:
 m=image(n)
 for i in range(0x18,0xc3):
  if i not in (0x93,0x94):assert m[d+i]==source[s+i],(n,hex(i))
 assert m[d+0x93]|m[d+0x94]<<8==d+0x9a
print('OK - seven type-$01 handler copies match the source and relocated jump')
