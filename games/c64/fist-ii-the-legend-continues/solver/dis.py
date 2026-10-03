"""Disassemble a range of the entry image: python3 dis.py 0576 0700 (hex)."""
import os, sys
G=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); ROOT=os.path.dirname(os.path.dirname(os.path.dirname(G)))
sys.path.insert(0,os.path.join(ROOT,'kit','c64')); sys.path.insert(0,os.path.join(ROOT,'kit','scripts'))
import opcodes
ram=opcodes.image(G,os.path.join(G,'work','f2-entry.vsf'))[0]
a=int(sys.argv[1],16); e=int(sys.argv[2],16)
while a<e:
    d=opcodes.decode(ram,a)
    if not d: print(f'  ${a:04X}  {ram[a]:02X}'); a+=1; continue
    print(opcodes.row(a,d)); a+=len(d[2])
