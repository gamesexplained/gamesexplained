"""Walk in steps and log (room, column , map position 2, height 2, scroll direction 535, exit bits /bin/bash473, move D, exit index /bin/bash806, scroll flags).

  python3 probe.py <snapshot> r4 l2 n1    right 4 s, left 2 s, still 1 s"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import sys
pause(rpc); c('vice_snapshot_load',{'name':sys.argv[1]}); c('vice_execution_run'); time.sleep(0.5)
enc=bytearray(read_mem(rpc,0xE609,162))
for i in range(54):
    if enc[3*i]&0x60!=0x60: enc[3*i]|=0x80
poke(rpc,0xE609,list(enc))
for step in sys.argv[2:]:
    d={'r':RIGHT,'l':LEFT,'n':0}[step[0]]; n=float(step[1:])
    last=None;t0=time.time()
    while time.time()-t0<n:
        poke(rpc,0x412,[0x7F]); poke(rpc,0x413,[0]); joy(rpc,2,d); time.sleep(0.03)
        s=(read_mem(rpc,0x46B,1)[0],read_mem(rpc,0xE5,1)[0],read_mem(rpc,0x72,1)[0],read_mem(rpc,0x92,1)[0],read_mem(rpc,0x1535,1)[0],read_mem(rpc,0x473,1)[0],read_mem(rpc,0x8D,1)[0],read_mem(rpc,0x806,1)[0],read_mem(rpc,0x405,8).hex())
        if s!=last: print(step,s); last=s
joy(rpc,2,0)
