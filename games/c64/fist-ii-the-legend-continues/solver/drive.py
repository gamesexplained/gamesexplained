"""Drive the hero along a list of hops in the running emulator.

  python3 drive.py <start snapshot name> '<hops JSON>' <end snapshot name>

A hop is [room, column, exit type, destination]. Type 0 means walk to the
column only (used to touch a scroll). Route testing only: every encounter
but the scrolls is marked done and energy is held, so no fight is played.
Saves a snapshot f2-in<room>-<time> on the first walk-only hop in a room,
and the end snapshot. Exit status 0 when it ends in the last hop's
destination.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
# Drive the hero along a list of exits [room, column, type, destination room].
# Route testing only: fights are switched off and the hero's energy kept up.
hops=json.loads(sys.argv[2])
HOLES={int(k):[(e[1],e[1]-4,e[1]+4) for e in v] for k,v in json.load(open(os.path.join(HERE,'holes.json'))).items()}
HOLES.setdefault(85,[]).append((118,112,124))   # type-16 drop 115-121: live, a somersault from 112 lands at 122
pause(rpc); c('vice_snapshot_load',{'name':sys.argv[1]}); c('vice_execution_run'); time.sleep(0.5)
room=lambda: read_mem(rpc,0x46B,1)[0]
col=lambda: read_mem(rpc,0xE5,1)[0]
def keep(): poke(rpc,0x412,[0x7F]); poke(rpc,0x413,[0])
enc=bytearray(read_mem(rpc,0xE609,162))
for i in range(54):
    if enc[3*i]&0x60!=0x60: enc[3*i]|=0x80
poke(rpc,0xE609,list(enc))
USED={}; SAVED=set()
ACT={10:UP,2:UP,9:DOWN,1:DOWN,11:UP,4:UP,3:UP|RIGHT,19:UP|RIGHT,18:RIGHT,12:LEFT,5:UP|RIGHT,15:DOWN,20:UP,14:UP}
def walk_to(r,cl):
    hist=[]; t0=time.time()
    while abs(col()-cl)>1 and time.time()-t0<40 and room()==r:
        keep(); x=col(); right=x<cl
        ahead=[h for h in HOLES.get(r,[]) if (x<h[0]<cl if right else cl<h[0]<x)]
        if ahead:
            h=min(ahead) if right else max(ahead); take=h[1] if right else h[2]; h=h[0]
            if abs(x-take)<=10:
                joy(rpc,2,RIGHT if right else LEFT)
                t1=time.time()
                while (col()<take if right else col()>take) and time.time()-t1<5: time.sleep(0.02)
                joy(rpc,2,0); time.sleep(0.2)
                x0=col(); joy(rpc,2,UP|(LEFT if right else RIGHT)); time.sleep(0.3); joy(rpc,2,0); time.sleep(2.5)
                print(f'  somersault at {x0} over hole {h}: now room {room()} col {col()}')
                if room()!=r: return False
                continue
        joy(rpc,2,RIGHT if right else LEFT); time.sleep(0.08)
        hist.append(col())
        if len(hist)>12 and len(set(hist[-12:]))==1:
            for k in range(3):
                for kick in (FIRE|(RIGHT if right else LEFT), FIRE|UP|(RIGHT if right else LEFT), FIRE|DOWN|(RIGHT if right else LEFT)):
                    joy(rpc,2,kick); time.sleep(0.5); joy(rpc,2,0); time.sleep(0.4)
            print(f'  kicked at a barrier in room {r} col {col()}')
            hist.clear()
    joy(rpc,2,0); time.sleep(0.2); return True
start=[k for k,h in enumerate(hops) if h[0]==room()]
hops=hops[start[0]:] if start else hops
for r,cl,t,dst in hops:
    if room()!=r: print('not in',r,'but',room()); break
    if not walk_to(r,cl): print('fell'); break
    if t==0 and r not in SAVED:
        SAVED.add(r); pause(rpc); c('vice_snapshot_save',{'name':f'f2-in{r}-{int(time.time())}','description':'route test'}); c('vice_execution_run')
    if t==0:
        time.sleep(1.5); print(f'  walked to {r}@{col()} scrolls {read_mem(rpc,0x405,8).hex()}'); continue
    t0=time.time()
    tries=[ACT.get(t,UP),UP,DOWN,LEFT,RIGHT,UP|LEFT,UP|RIGHT]
    k=0
    while room()!=dst and k<len(tries)*2:
        keep(); joy(rpc,2,tries[k%len(tries)]); time.sleep(0.5); joy(rpc,2,0); time.sleep(1.5); k+=1
        if room()==r and abs(col()-cl)>2: walk_to(r,cl)
    if room()==dst: USED.setdefault(t,set()).add(tries[(k-1)%len(tries)])
    print(f'{r}@{cl} type {t} -> {room()} (want {dst}) col {col()}  scrolls {read_mem(rpc,0x405,8).hex()} lives {read_mem(rpc,0x2D32,1)[0]}')
    if room()!=dst: break
print('actions used by type',{k:sorted(v) for k,v in USED.items()})
print('final',room(),col(),read_mem(rpc,0x405,8).hex())
pause(rpc); c('vice_snapshot_save',{'name':sys.argv[3],'description':'route test'}); c('vice_execution_run')
sys.exit(0 if room()==hops[-1][3] else 1)
