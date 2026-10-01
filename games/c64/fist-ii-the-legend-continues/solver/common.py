"""Shared set-up for the solver's emulator scripts: paths and the VICE connection.

Every script here runs from any directory. The emulator must be up
(`python3 kit/scripts/tools.py vice`); snapshots are named, not pathed: VICE
keeps them in tools/vice-home/config/vice/mcp_snapshots/<name>.vsf.
"""
import os, sys, json, time
HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(GAME)))
OUT = os.path.join(GAME, "work", "solver")          # gitignored: plans, logs
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, os.path.join(ROOT, "kit", "c64"))
from vice import *                                   # connect, call, read_mem, poke, joy, pause, UP, DOWN, LEFT, RIGHT, FIRE
rpc = connect()
def c(n, a=None): return call(rpc, n, a or {})
def load(name):
    pause(rpc); c('vice_snapshot_load', {'name': name}); c('vice_execution_run'); time.sleep(0.3)
def save(name, why='route test'):
    pause(rpc); c('vice_snapshot_save', {'name': name, 'description': why}); c('vice_execution_run')
R = lambda a: read_mem(rpc, a, 1)[0]
def keep(): poke(rpc, 0x412, [0x7F]); poke(rpc, 0x413, [0])   # hero energy full, opponent's 0
def no_fights():
    """Mark every encounter that is not a scroll as done ($E609 flags bit 7)."""
    enc = bytearray(read_mem(rpc, 0xE609, 162))
    for i in range(54):
        if enc[3*i] & 0x60 != 0x60: enc[3*i] |= 0x80
    poke(rpc, 0xE609, list(enc))
