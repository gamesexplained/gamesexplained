"""Room 77 tests: from snapshot f2-in77-end walk right to a column, then a sequence of stick:seconds.

  python3 chute77.py 221 "0:0.4" "UP:0.4" "0:3""""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import sys
take=int(sys.argv[1]); seq=[(eval(a.split(':')[0]),float(a.split(':')[1])) for a in sys.argv[2:]]
pause(rpc); c('vice_snapshot_load',{'name':'f2-in77-end'}); c('vice_execution_run'); time.sleep(0.3)
R=lambda a:read_mem(rpc,a,1)[0]
t0=time.time()
while R(0xE5)<take and time.time()-t0<20 and R(0x46B)==77:
    poke(rpc,0x412,[0x7F]); joy(rpc,2,RIGHT); time.sleep(0.02)
joy(rpc,2,0); time.sleep(0.1)
tr=[]
for mv,d in seq:
    t1=time.time()
    while time.time()-t1<d:
        joy(rpc,2,mv); poke(rpc,0x412,[0x7F]); s=(R(0x46B),R(0xE5),R(0x92),R(0x8D),R(0x72))
        if not tr or tr[-1]!=s: tr.append(s)
        time.sleep(0.02)
joy(rpc,2,0)
rooms=[]; [rooms.append(s[0]) for s in tr if not rooms or rooms[-1]!=s[0]]
print(take,sys.argv[2:],'rooms',rooms,'end',tr[-1])
