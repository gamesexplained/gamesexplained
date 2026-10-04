#!/usr/bin/env python3
"""Exercise original SAVE/LOAD failures in VICE using disposable D64s.

Requires this clone's paused VICE, zero existing checkpoints, play-round1.vsf,
and local c1541. Original instructions remain intact; scratch entry trampolines,
records, flags and held FIRE provide prepared states, not a full playthrough.
The previous machine/disks/warp state is restored even on a failed assertion.
Output D64/PRG/snapshot files stay private. Run without Python -O.
"""
from datetime import datetime, timezone
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time

GAME = Path(__file__).resolve().parents[1]
ROOT = GAME.parents[2]
WORK = GAME / 'work'
C1541 = ROOT / 'tools/vice-mcp/bin/c1541'
sys.path.insert(0, str(ROOT / 'kit/c64'))
from vice import connect, ask, read_mem, pause, snapshot_load, clear_checkpoints, warp

rpc = None
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
def c1541(*args, check=True):
    return subprocess.run([str(C1541), *map(str,args)],
                          capture_output=True, text=True, check=check)
def disk(name, *, full=False, existing=False, readonly=False):
    p=WORK/('disk-audit-'+name+'.d64')
    if p.exists(): p.chmod(0o644); p.unlink()
    c1541('-format', 'audit disk,ad', 'd64', p)
    if existing:
        old=WORK/'disk-audit-old-score.prg';old.write_bytes(b'\x00\xc1'+bytes([0x55])*128)
        c1541('-attach', p, '-write', old, 'scor')
    if full:
        filler=WORK/'disk-audit-filler.prg';filler.write_bytes(bytes(254*(663 if existing else 664)))
        c1541('-attach', p, '-write', filler, 'filler')
    # Standard 35-track D64 BAM: track 18 starts after the first 357 sectors.
    raw=p.read_bytes();bam=raw[357*256:358*256]
    free=sum(bam[4*t] for t in range(1,36) if t!=18)
    assert free == (0 if full else 663 if existing else 664), free
    if full:
        sectors = [0] + [21 if t <= 17 else 19 if t <= 24 else 18 if t <= 30 else 17 for t in range(1,36)]
        def sector(t, s):
            assert 1 <= t <= 35 and 0 <= s < sectors[t], (t,s)
            a = (sum(sectors[:t]) + s) * 256
            return raw[a:a+256]
        directory = sector(18,1)
        slot = 32 if existing else 0
        track, sec = directory[slot+3:slot+5]
        visited = set()
        while track:
            assert (track,sec) not in visited, 'Cyclic filler chain'
            visited.add((track,sec))
            block = sector(track,sec)
            track, sec = block[:2]
        assert len(visited) == (663 if existing else 664), len(visited)
    if readonly: p.chmod(0o444)
    return p, free, hashlib.sha256(raw).hexdigest()
def prepare(path):
    snapshot_load(rpc, str(WORK/'play-round1.vsf'))
    clear_checkpoints(rpc)
    call('vice_disk_attach', unit=8, path=str(path))
    call('vice_joystick_set', port=2, direction='center', fire=False)
    # Prepared record/changed-entry flag, then the real save gate and caller.
    write(0xc100, range(128));write(0xc380, [1]+[0]*9)
    write(0x600, [0xd2,0x99,0x47,0x40,0x10,0x06,0xe8])
    write(0x39,[0,6]);reg('PC',0x92c);reg('SP',255);reg('D',0)
    until(0x8b1e)
    assert read_mem(rpc,0xc100,128)==bytes(range(128))
def dos_status():
    # An external diagnostic after the game's status decision, not its behavior.
    # OPEN15 with an empty name; CHRIN through CR; CLRCHN/CLOSE; stop at $0670.
    code=[0x20,0xcc,0xff,0xa9,0,0x20,0xbd,0xff,0xa9,15,0xa2,8,0xa0,15,0x20,0xba,0xff,
          0x20,0xc0,0xff,0xa2,15,0x20,0xc6,0xff,0xa0,0]
    loop=0x620+len(code)
    code += [0x20,0xcf,0xff,0x99,0,7,0xc8,0xc9,13,0xf0,9,0x20,0xb7,0xff,0xd0,4,0xc0,80,0x90,
             (loop-(0x620+len(code)+20))&255,
             0x8c,0xff,6,0x20,0xcc,0xff,0xa9,15,0x20,0xc3,0xff,0x4c,0x70,6]
    write(0x620,code);write(0x700,[0]*80)
    reg('PC',0x620);reg('SP',255);reg('D',0);until(0x670,45)
    count=read_mem(rpc,0x6ff,1)[0]
    return read_mem(rpc,0x700,min(count,80)).decode('ascii',errors='replace').strip()


def run_save_cases(paths,results):
    cases=[('writable',{}),('full-empty',{'full':True}),('full-existing',{'full':True,'existing':True}),('protected-empty',{'readonly':True}),('protected-existing',{'readonly':True,'existing':True})]
    for name,options in cases:
        path,free,before_hash=disk(name,**options);paths.append(path)
        prepare(path)
        until(0x8b58)
        status=read_mem(rpc,0xfb,1)[0]
        if status==0:
            until(0x610);decision='success-return'
        else:
            checkpoint(0x4858,exec=False,load=True,stop=True)
            call('vice_execution_run');waitstop();decision='disk-error-prompt'
            assert any(c.get('hit_count',0) and c['start']==0x4858 for c in call('vice_checkpoint_list')['checkpoints'])
            clear_checkpoints(rpc)
        print(json.dumps({'case':name,'readst':status,'decision':decision,'phase':'before external DOS diagnostic'}),flush=True)
        drive=dos_status()
        call('vice_disk_detach',unit=8)
        dest=WORK/('disk-audit-'+name+'-scor.prg')
        if dest.exists():dest.unlink()
        extracted=c1541('-attach',path,'-read','scor',dest,check=False)
        payload=dest.read_bytes()[2:] if dest.exists() else None
        row={'case':name,'initial_free_blocks':free,'readonly_image':bool(options.get('readonly')),
             'existing_score':bool(options.get('existing')),'readst':status,'decision':decision,'dos_status':drive,
             'saved_record_matches':payload==bytes(range(128)),
             'old_record_preserved':payload==bytes([0x55])*128,
             'extracted_payload_bytes':None if payload is None else len(payload),
             'extract_exit':extracted.returncode,'image_unchanged':hashlib.sha256(path.read_bytes()).hexdigest()==before_hash}
        success = name in ('writable', 'full-existing')
        assert status == (0 if success else 128), row
        expected_code = {'writable':0, 'full-empty':67, 'full-existing':0, 'protected-empty':26, 'protected-existing':63}[name]
        assert int(drive.split(',')[0]) == expected_code, row
        assert row['saved_record_matches'] == success, row
        assert row['old_record_preserved'] == (name=='protected-existing'), row
        if not success: assert row['image_unchanged'], row
        if not success and not options.get('existing'): assert payload is None, row
        if success or options.get('existing'): assert extracted.returncode == 0 and len(payload) == 128, row
        results.append(row);print(json.dumps(row),flush=True)


def value(i):
    raw=read_mem(rpc,0x2800+8*i,8)
    if raw[6]&1:return int.from_bytes(raw[2:4],'big',signed=True)
    return 0 if not raw[0] else (-1 if raw[5]&128 else 1)*int.from_bytes(raw[1:5],'big')*2**(raw[0]-160)
def setvalue(i,n):
    flags=read_mem(rpc,0x2806+8*i,1)[0]&4
    write(0x2800+8*i,[0,0,n>>8&255,n&255,0,0,flags|1])
def next_save_or_return():
    clear_checkpoints(rpc)
    checkpoint(0x8b1e,exec=True,stop=True);checkpoint(0x610,exec=True,stop=True)
    call('vice_execution_run');pc=waitstop();clear_checkpoints(rpc)
    assert pc in [0x8b1e,0x610],hex(pc)
    return pc


def run_retry_cases(paths,results):
    for name,options in [('full',{'full':True}),('protected',{'readonly':True})]:
        path,free,before=disk('retry-'+name,**options);paths.append(path);prepare(path)
        call('vice_joystick_set',port=2,direction='center',fire=True)
        statuses=[];counters=[]
        while True:
            assert len(statuses)<4
            until(0x8b58);statuses.append(read_mem(rpc,0xfb,1)[0]);counters.append(value(3))
            print(json.dumps({'case':name,'attempt':len(statuses),'readst':statuses[-1],'counterBeforeError':counters[-1]}),flush=True)
            if next_save_or_return()==0x610:break
        assert statuses==[128]*3 and value(3)==3
        call('vice_joystick_set',port=2,direction='center',fire=False)
        call('vice_disk_detach',unit=8)
        row={'case':'save-'+name+'-exhaustion','save_calls':len(statuses),'readst':statuses,'counter_before_error':counters,
             'final_counter':value(3),'terminal_pc':'$0610','image_unchanged':hashlib.sha256(path.read_bytes()).hexdigest()==before}
        assert row['image_unchanged'];results.append(row);print(json.dumps(row),flush=True)
    path,free,before=disk('missing-level');paths.append(path)
    snapshot_load(rpc,str(WORK/'play-round1.vsf'));clear_checkpoints(rpc)
    call('vice_disk_attach',unit=8,path=str(path))
    # Initialize actual attached DOS state, then enter original load flow.
    write(0x620,[0x20,0x62,0x8b,0x4c,0x23,6]);reg('PC',0x620);reg('SP',255);reg('D',0);until(0x623)
    setvalue(8,0);setvalue(20,0)
    write(0x39,[0xc6,0x29]);reg('PC',0x92c);reg('SP',255);reg('D',0)
    call('vice_joystick_set',port=2,direction='center',fire=True)
    until(0x8a66)
    statuses=[]
    while True:
        assert len(statuses)<5
        until(0x8ab3);statuses.append(read_mem(rpc,0xfb,1)[0])
        clear_checkpoints(rpc);checkpoint(0x8a66,exec=True,stop=True)
        checkpoint(0x3e6c,exec=False,load=True,stop=True)
        call('vice_execution_run');pc=waitstop()
        checkpoints=call('vice_checkpoint_list')['checkpoints']
        stop_hit=any(x.get('hit_count',0)>0 and x.get('start')==0x3e6c for x in checkpoints)
        print(json.dumps({'case':'missing-level','attempt':len(statuses),'readst':statuses[-1],'pc':hex(pc),'counter':value(3),'checkpoints':checkpoints}),flush=True)
        clear_checkpoints(rpc)
        if pc!=0x8a66:
            assert stop_hit,checkpoints
            break
    assert statuses==[66]*4 and value(3)==3
    row={'case':'level-load-exhaustion','load_calls':len(statuses),'readst':statuses,'final_counter':value(3),'terminal_bytecode':'$3E6C'}
    results.append(row)

def main():
    global rpc, WORK, C1541
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('private_dir', nargs='?', type=Path, default=WORK)
    parser.add_argument('--original', type=Path, default=ROOT.parent/'wizard.g64', help='Original supplied G64: hash checked, never attached or written')
    parser.add_argument('--c1541', type=Path, default=C1541)
    args = parser.parse_args()
    WORK = args.private_dir.resolve(); C1541 = args.c1541.resolve()
    original = args.original.resolve()
    original_hash = hashlib.sha256(original.read_bytes()).hexdigest()
    assert original_hash == '040b0615ab6dc3d741ee7bb85b59352a7c4c1a6fca0276672b9ab71ffa398c81', 'Different disk edition'
    assert (WORK/'play-round1.vsf').is_file() and C1541.is_file()
    rpc = connect()
    assert call('vice_ping')['execution']=='paused', 'Pause VICE first'
    assert not call('vice_checkpoint_list')['checkpoints'], 'Remove existing checkpoints first'
    before_pc=call('vice_registers_get')['PC']
    assert call('vice_registers_get')['PC']==before_pc
    oldwarp=call('vice_machine_config_get')['resources']['WarpMode']
    saved=call('vice_snapshot_save',name='wizard_disk_audit_restore_'+str(time.time_ns()),include_roms=False,include_disks=True)
    paths=[]; results=[]
    try:
        warp(rpc,True)
        run_save_cases(paths,results)
        run_retry_cases(paths,results)
        assert len(results)==8
        (WORK/'disk-failures-result.json').write_text(json.dumps({'date':datetime.now(timezone.utc).date().isoformat(),'original_sha256':original_hash,'cases':results},indent=2)+'\n')
    finally:
        pause(rpc);clear_checkpoints(rpc)
        call('vice_joystick_set',port=2,direction='center',fire=False)
        call('vice_disk_detach',unit=8)
        for p in paths:p.chmod(0o644)
        snapshot_load(rpc,saved['name']);warp(rpc,bool(oldwarp))
        assert call('vice_registers_get')['PC']==before_pc
        assert hashlib.sha256(original.read_bytes()).hexdigest()==original_hash
        print(json.dumps({'restored':True,'original_unchanged':True}),flush=True)
    print(json.dumps({'cases':len(results),'passed':True}),flush=True)

if __name__=='__main__': main()
