"""Guard complete opening resource extents and pointer directories against gaps."""
import hashlib,json,sys
from pathlib import Path
G=Path(__file__).resolve().parent
sys.path[:0]=[str(G.parents[2]/'kit/cpu'),str(G.parents[2]/'kit/c64')]
from opcodes import decode,operand
S={'blocks':sum((json.loads((G/f'parts/{p}/symbols.json').read_text())['blocks'] for p in ('resident','opening')),[])}   # the opening lies over the resident engine
r=bytearray(65536);known=bytearray(65536)
for part in ('resident','opening'):   # the opening lies over the resident engine
 for row in json.loads((G/f'parts/{part}/listing.json').read_text())['records']:
  for i,v in enumerate(row.get('b',[])):r[row['a']+i]=v;known[row['a']+i]=1
extents=json.loads((G/'analysis-scope.json').read_text())['retained_load_extents']
for e in extents:
 a,b=e['start'],e['end'];assert all(known[a:b+1]);assert hashlib.sha256(r[a:b+1]).hexdigest()==e['sha256']
 # Where available, guard the actual hand-over comparison as well.
entry=G/'parts/opening/work/entry.vsf'
if entry.exists():
 from snapshot import read
 original=read(entry)
 for e in extents:assert original[e['start']:e['end']+1]==r[e['start']:e['end']+1]
def opaque(a):return any(e['start']<=a<=e['end'] for e in extents)
count=0
for low,high,n in [(0xd900,0xd800,256),(0x6c3f,0x6c02,32),(0x6c5f,0x6c22,29),(0x1f33,0x1f6e,59),(0xbde7,0xbe0a,35),(0xaa82,0xaa74,14),(0xaa9e,0xaa90,14),(0x78d0,0x78e8,24)]:
 for i in range(n):
  a=r[low+i]+256*r[high+i];assert not opaque(a),(hex(low),i,hex(a));count+=1
for base in (0xa9e8,0xaa04,0xaa20,0xaa3c,0xaa58):
 for i in range(14):
  a=r[base+14+i]+256*r[base+i];assert not opaque(a);count+=1
# Every overlay API stub lands on a typed instruction, not just a label.
code=set();instructions={}
for b in S['blocks']:
 if b['type']!='Code':continue
 a=b['start']
 while a<=b['end']:
  d=decode(r,a);code.add(a);instructions[a]=d;a+=len(d[2])
for a in range(0x800,0x87e,3):
 assert r[a]==0x4c;target=r[a+1]+256*r[a+2];assert target in code,(hex(a),hex(target));count+=1
assert r[0x87e]==0x60
# Reported absence is restricted to direct decoded operands, not an assertion
# about arbitrary indirect/runtime inputs or other scene loads.
for a,d in instructions.items():
 if d[1] in ('abs','abx','aby','ind'):
  target=operand(a,d[1],d[2]);assert not opaque(target),(hex(a),hex(target))
print(f'OK - {len(extents)} retained extents, {count} directory/API entries and {len(instructions)} direct instruction operands checked')
