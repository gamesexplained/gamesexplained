#!/usr/bin/env python3
"""Replay 20 prepared compiler/editor cases in paused VICE, then restore state.

Usage: KIT_VICE_PORT=6511 python3 .../audit_live_compiled.py [private-dir]
Needs play-round1.vsf and editor-menu.vsf. No game instructions are patched;
scalar/memory fixtures and scratch entry trampolines supply the test inputs.
These checks establish prepared-state behavior, not full input routes.
"""
import json
from pathlib import Path
import sys
import time
GAME=Path(__file__).resolve().parent.parent
ROOT=GAME.parents[2]
WORK=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else GAME/'work'
sys.path.insert(0,str(ROOT/'kit/c64'))
from vice import connect, ask, read_mem, pause, snapshot_load, clear_checkpoints, warp
rpc=None

def call(tool, **args): return ask(rpc, tool, args)
def write(a, data): call('vice_memory_write', address=f'${a:04X}', data=list(data))
def reg(name, value): call('vice_registers_set', register=name, value=value)
def waitstop(seconds=60):
    end = time.monotonic() + seconds
    while call('vice_ping')['execution'] != 'paused':
        if time.monotonic() >= end:
            pause(rpc)
            raise AssertionError('VICE stop timeout at ' + hex(call('vice_registers_get')['PC']))
        time.sleep(.05)
    return call('vice_registers_get')['PC']
def until(a, seconds=60):
    call('vice_run_until', address=f'${a:04X}')
    got = waitstop(seconds)
    assert got == a, (hex(got), hex(a))
def checkpoint(a, **kwargs):
    result = call('vice_checkpoint_add', start=f'${a:04X}', **kwargs)
    return result.get('checkpoint_num', result.get('checkpoint', {}).get('checkpoint_num'))

def value(i):
    raw=read_mem(rpc,0x2800+8*i,8)
    if raw[6]&1:return int.from_bytes(raw[2:4],'big',signed=True)
    return 0 if not raw[0] else (-1 if raw[5]&128 else 1)*int.from_bytes(raw[1:5],'big')*2**(raw[0]-160)
def setvalue(i,n):
    flags=read_mem(rpc,0x2806+8*i,1)[0]&4
    write(0x2800+8*i,[0,0,n>>8&255,n&255,0,0,flags|1])


def bytecode(entry, stops):
    clear_checkpoints(rpc)
    for a in stops: checkpoint(a, exec=False, load=True, stop=True)
    write(0x39,[entry&255,entry>>8]);reg('PC',0x92c);reg('SP',255);reg('D',0);reg('I',1)
    call('vice_execution_run');waitstop(20)
    hits=[c['start'] for c in call('vice_checkpoint_list')['checkpoints'] if c.get('hit_count',0)]
    clear_checkpoints(rpc)
    assert len(hits)==1,hits
    return hits[0]

def main():
    global rpc
    rpc=connect()
    assert call('vice_ping')['execution']=='paused'
    assert not call('vice_checkpoint_list')['checkpoints']
    before_pc=call('vice_registers_get')['PC'];oldwarp=call('vice_machine_config_get')['resources']['WarpMode']
    saved=call('vice_snapshot_save',name='wizard_compiled_restore_'+str(time.time_ns()),include_roms=False,include_disks=True)
    rows=[]
    try:
        warp(rpc,True)
        for offset in [None,-41,-40,-39,-1,0,1]:
            snapshot_load(rpc,str(WORK/'editor-menu.vsf'))
            write(0xc400,[32]*880);setvalue(4,19);setvalue(7,88);setvalue(9,130)
            write(0x32e0,[0,0,14,0,0])
            if offset is not None:write(0xc598+offset,[91])
            bytecode(0x4c54,[0x4b64])
            positions=[-41,-40,-39,-1,0,1]
            result=[read_mem(rpc,0xc598+x,1)[0] for x in positions]
            if offset in [None,-41,-40]:assert result==[104,105,106,107,32,107],result
            else:assert result==[91 if x==offset else 32 for x in positions],result
            rows.append({'kind':'portal placement','obstacle_offset':offset,'cells':result})
        for char in [43,44,45,46,47,48,57,58]:
            snapshot_load(rpc,str(WORK/'editor-menu.vsf'));setvalue(0,char)
            stop=bytecode(0x48f7,[0x4915,0x48c5]);accepted=stop==0x4915
            assert accepted==(char in [44,48,57])
            rows.append({'kind':'numeric filter','character':char,'accepted':accepted})
        snapshot_load(rpc,str(WORK/'play-round1.vsf'))
        write(0xc006,[3]);write(0x801d,[0xea]);destinations=[0xc8e8,0xcad8,0xcae0,0xcb18,0xcb20,0xcb28]
        for i,a in enumerate(destinations):write(a,[16+i]*8);write(a+0x400,[144+i]*8)
        bytecode(0x3831,[0x3835])
        assert read_mem(rpc,0xc006,1)==bytes([3]) and read_mem(rpc,0x801d,1)==bytes([0xea])
        for i,a in enumerate(destinations):assert read_mem(rpc,a,8)==bytes([144+i]*8)
        rows.append({'kind':'GAME glyph restore','glyphs':6,'demo_selection_preserved':3,'demo_hook_preserved':234})
        snapshot_load(rpc,str(WORK/'play-round1.vsf'))
        setvalue(16,63);bytecode(0x3132,[0x2b67])
        assert value(16)==64 and read_mem(rpc,0xc06e,2)==bytes([1,255]) and read_mem(rpc,0xc02d,1)==bytes([1])
        rows.append({'kind':'supported GAME Slow comment','delay_before':63,'delay_after':64,'pursuit':[1,255]})
        snapshot_load(rpc,str(WORK/'play-round1.vsf'))
        write(0xd01a,[0]);write(0xdc0f,[0]);bytecode(0x3e6c,[0x3e70])
        assert read_mem(rpc,0xd01a,1)[0]&15==4 and read_mem(rpc,0xdc0f,1)[0]&1==1
        assert read_mem(rpc,0x314,2)==bytes([0xbf,0x7c])
        rows.append({'kind':'GAME failed-load abort','vic_irq_mask':4,'cia1_timer_b_running':True,'irq_vector':'$7CBF'})
        snapshot_load(rpc,str(WORK/'play-round1.vsf'))
        write(0x39,[255,6]);write(0x91,[0]);reg('PC',0x19be);reg('SP',255);reg('D',0);reg('I',1)
        until(0x92c)
        assert read_mem(rpc,0x39,2)==bytes([0,7]) and read_mem(rpc,0x926,3)==bytes([0x4c,0xde,0x19])
        write(0x600,[0x20,0xd2,0x19,0x4c,3,6]);reg('PC',0x600);until(0x603)
        assert read_mem(rpc,0x926,3)==bytes([0xe6,0x39,0xd0])
        rows.append({'kind':'interpreter checked fetch','cursor_before':'$06FF','cursor_after':'$0700','normal_dispatch_restored':True})
        snapshot_load(rpc,str(WORK/'play-round1.vsf'))
        reg('PC',0x2342);reg('SP',255);reg('D',0);reg('I',1);until(0xa474)
        rows.append({'kind':'supported interpreter NEW comment','entry':'$2342','terminal_pc':'$A474'})
        (WORK/'live-compiled-audit-result.json').write_text(json.dumps(rows,indent=2)+'\n')
        print(json.dumps({'cases':len(rows),'results':rows}),flush=True)
    finally:
        pause(rpc);clear_checkpoints(rpc);snapshot_load(rpc,saved['name']);warp(rpc,bool(oldwarp))
        assert call('vice_registers_get')['PC']==before_pc
        print('Restored original paused state',flush=True)

if __name__=='__main__':main()
