"""From a snapshot, walk right to a column, give one stick input and report where the hero ends.

  python3 jump.py <snapshot> <column> "UP|LEFT" [hold seconds]"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import sys
snap=sys.argv[1]; take=int(sys.argv[2]); mv=eval(sys.argv[3]); hold=float(sys.argv[4]) if len(sys.argv)>4 else 0.3
pause(rpc); c('vice_snapshot_load',{'name':snap}); c('vice_execution_run'); time.sleep(0.3)
R=lambda a:read_mem(rpc,a,1)[0]
t0=time.time()
while R(0xE5)<take and time.time()-t0<20:
    poke(rpc,0x412,[0x7F]); joy(rpc,2,RIGHT); time.sleep(0.02)
joy(rpc,2,0); time.sleep(0.15); x0=R(0xE5)
joy(rpc,2,mv); 
seen=[]; t0=time.time()
while time.time()-t0<3:
    if time.time()-t0>hold: joy(rpc,2,0)
    poke(rpc,0x412,[0x7F]); s=(R(0x46B),R(0xE5),R(0x92),R(0x8D))
    if not seen or seen[-1]!=s: seen.append(s)
    time.sleep(0.02)
print('take',x0,'->',seen[-1],'max col',max(s[1] for s in seen if s[0]==seen[0][0]), 'moves',sorted(set(s[3] for s in seen)))
