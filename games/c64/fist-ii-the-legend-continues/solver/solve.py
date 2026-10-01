"""Breadth-first search for a scroll order and route through Fist II's world.

Reads the exit lists (AEC), item lists (01E: walls, barriers), the area
table (A71), the encounter table () and the wall reach tables
(/bin/bashABD//bin/bashAC7) from work/f2-entry.vsf. A state is (room, section between
walls). See README.md for what it models and what it gets wrong.

  python3 solve.py                      plan from the start (room 94)
  FROM=73:20:1,2,4,6,8: python3 solve.py
      plan from room 73, column 20, scrolls 1,2,4,6,8 delivered, none carried
      (the last field lists scrolls found but not yet delivered)

Writes work/solver/plan.json and work/solver/hops.json: hops are
[room, exit column, exit type, destination room], what drive.py takes.
"""
from collections import deque
import json,sys
import os
HERE=os.path.dirname(os.path.abspath(__file__)); G=os.path.dirname(HERE); OUT=os.path.join(G,'work','solver'); os.makedirs(OUT,exist_ok=True)
# the 64 KB image from the entry snapshot (orientation.md, step 5); RAM starts at byte 209 of a VICE 3.x .vsf
_vsf=os.path.join(G,'work','f2-entry.vsf')
if os.path.exists(_vsf): d=open(_vsf,'rb').read()[209:209+65536]
else:   # no snapshot in this session: the same bytes from the committed listing
    d=bytearray(65536)
    for _r in json.load(open(os.path.join(G,'listing.json')))['records']:
        if _r.get('b'): d[_r['a']:_r['a']+len(_r['b'])]=bytes(_r['b'])
a=0x4AEC; ex={}
for s in range(123):
    L=[]
    while d[a]: L.append(tuple(d[a:a+4])); a+=4
    a+=1; ex[s]=L
area=lambda r:d[0x4A71+r]
ptr=[d[0x501E+2*i]|d[0x501F+2*i]<<8 for i in range(105)]
def items(r):
    i=r if r<0x3C else area(r)+d[0x501D]
    a,e=ptr[i],ptr[i+1]; out=[]
    while a<e:
        if d[a]&0x40: out.append((d[a],d[a+1],None)); a+=2
        else: out.append((d[a],d[a+1],d[a+2])); a+=3
    return out
scroll={}
for i in range(54):
    f,r,p=d[0xE609+3*i:0xE60C+3*i]
    if f&0x60==0x60: scroll[f&7]=(r,p)
TRAP={r for r in range(123) if area(r)==5}
ABD=list(d[0xABD:0xAC7]); AC7=list(d[0xAC7:0xAD1])
def barriers(r,dl):
    ws=[]
    for b0,col,par in items(r):
        t=b0&0x0F
        if par is None: ws.append((col,t)); continue
        tt=b0&0x1F
        if tt==3 and 1 not in dl: ws.append((col,t))
        elif tt==7 and 4 not in dl: ws.append((col,t))
    for e in ex[r]:
        if e[0]==17 and not (area(r)==13 and 6 in dl): ws.append((e[1],'H%d'%(e[0])))   # a drop of 11 columns: cannot be walked or somersaulted across
        # in area 13 (room 79) scroll 6 narrows the drop to 7 columns ($067B), which a somersault crosses
    return sorted(ws)
def rl(t): return {'H17':-11,'H16':-7}[t] if isinstance(t,str) else ABD[t]
def rr(t): return 0 if isinstance(t,str) else AC7[t]
def seg(r,col,dl):
    col=max(col,1); ws=barriers(r,dl)
    cands=[k for k in range(len(ws)+1) if inside(r,k,col,dl)] or [sum(1 for c,t in ws if c<col)]
    for k in cands:
        if any(inside(r,k,e[1],dl) for e in ex[r]): return k
    return cands[0]
def inside(r,s,col,dl):
    ws=barriers(r,dl)
    lo=ws[s-1][0]-rl(ws[s-1][1]) if s>=1 and s-1<len(ws) else -999
    hi=ws[s][0]+rr(ws[s][1]) if s<len(ws) else 999
    return lo<=col<=hi
def exit_ok(r,dl):
    if area(r)==13 and 6 not in dl: return False
    if area(r)==7 and 3 not in dl: return False
    return True
def land(v,dc,dl):
    # arriving on a hole drops straight through to the floor below
    for n in range(8):
        w17=7 if area(v)==13 and 6 in dl else 11
        h=[e for e in ex[v] if (e[0]==11 and e[1]==dc) or (e[0]==17 and e[1]<=dc<e[1]+w17) or (e[0]==16 and e[1]<=dc<e[1]+7)]
        if not h: break
        v,dc=h[0][2],h[0][3]
    return v,dc
def neighbours(u,dl):
    r,s=u
    if not exit_ok(r,dl): return
    ws=barriers(r,dl)
    for t,col,v,dc in ex[r]:
        if v>=123: continue
        if not inside(r,s,col,dl): continue
        if r==52 and t==2 and 2 not in dl: continue   # scroll 2 opens room 52's exit to room 80 ($36DE-$373C)
        v2,dc2=land(v,dc,dl)
        if (r,col,v)==(4,128,84): v2,dc2=87,50   # live: arriving from room 4, the hero is carried on to room 87
        if v2 in TRAP and 8 not in dl: continue
        yield (v2,seg(v2,dc2,dl)),(col,t)
def bfs(start,dl,goal):
    prev={start:None}; q=deque([start])
    while q:
        u=q.popleft()
        if goal(u):
            p=[];v=u
            while prev[v]: w,how=prev[v]; p.append((w[0],how[0],v[0])); v=w
            return u,p[::-1]
        for v,how in neighbours(u,dl):
            if v not in prev: prev[v]=(u,how); q.append(v)
    return None,None
import os
pos0=(94,seg(94,50,set())); pos=pos0; dl=set(); plan=[]
if os.environ.get('FROM'):
    r0,c0,ds,cr=os.environ['FROM'].split(':'); dl={int(x) for x in ds.split(',') if x}
    pos=(int(r0),seg(int(r0),int(c0),dl))
    for n in [int(x) for x in cr.split(',') if x]:
        w,p2=bfs(pos,dl,lambda v,n=n:v[0]==0x43+n); dl.add(n); plan.append((n,[],p2)); pos=w
while len(dl)<8:
    best=None
    for n in range(8):
        if n+1 in dl: continue
        u,p1=bfs(pos,dl,lambda u,n=n:u[0]==scroll[n][0] and any(inside(u[0],u[1],scroll[n][1]+k,dl) for k in (0,)))
        if u is None: continue
        w,p2=bfs(u,dl,lambda v,n=n:v[0]==0x44+n)
        if w is None: continue
        c=len(p1)+len(p2)
        if best is None or c<best[0]: best=(c,n+1,p1,p2,w)
    if not best: print('STUCK',sorted(dl)); break
    c,sn,p1,p2,w=best; dl.add(sn); pos=w; plan.append((sn,p1,p2))
u,pf=bfs(pos,dl,lambda v:v[0]==122)
json.dump({'plan':plan,'final':pf},open(os.path.join(OUT,'plan.json'),'w'))
fmt=lambda p:' '.join(f"{a}>{c}" for a,col,c in p)
for sn,p1,p2 in plan: print(f"scroll {sn} (room {scroll[sn-1][0]}): {fmt(p1)} | chamber {0x43+sn}: {fmt(p2)}")
print('room 122:', fmt(pf) if pf else 'NOT REACHABLE')

def hops(p): return [[a,col,(lambda e:e[0])([e for e in ex[a] if e[1]==col and e[2]<123][0]),[e for e in ex[a] if e[1]==col and e[2]<123][0][2]] for a,col,c in p]
json.dump({'legs':[[sn,hops(p1),hops(p2)] for sn,p1,p2 in plan],'final':hops(pf) if pf else None},open(os.path.join(OUT,'hops.json'),'w'))
