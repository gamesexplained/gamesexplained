#!/usr/bin/env python3
"""What the callers of a routine read of the registers and flags it leaves: for each JSR to it in the
parts' listings, the instructions after the call are followed in a straight line until each of A,
X, Y and the flags C, Z, N, V has been set again; a register or flag read first is one the port's
routine must give back. A JSR followed by RTS passes the question to that routine's own callers,
and a JMP to the routine counts as a call by the routine it is in.
  python3 port/scripts/uses.py <label or $address> [parts]
"""
import json, os, sys

GAME = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
PARTS = (sys.argv[2] if len(sys.argv) > 2 else 'engine,flight').split(',')

# what each mnemonic reads and writes, of A X Y and the flags C Z N V
R = {}
def op(names, reads, writes):
    for n in names.split():
        R[n] = (set(reads.split()), set(writes.split()))
op('lda', '', 'A Z N'); op('ldx', '', 'X Z N'); op('ldy', '', 'Y Z N')
op('sta', 'A', ''); op('stx', 'X', ''); op('sty', 'Y', '')
op('tax', 'A', 'X Z N'); op('tay', 'A', 'Y Z N'); op('txa', 'X', 'A Z N'); op('tya', 'Y', 'A Z N')
op('tsx', '', 'X Z N'); op('txs', 'X', '')
op('pha', 'A', ''); op('pla', '', 'A Z N'); op('php', 'C Z N V', ''); op('plp', '', 'C Z N V')
op('adc sbc', 'A C', 'A C Z N V'); op('and ora eor', 'A', 'A Z N')
op('cmp', 'A', 'C Z N'); op('cpx', 'X', 'C Z N'); op('cpy', 'Y', 'C Z N')
op('bit', 'A', 'Z N V')
op('inx dex', 'X', 'X Z N'); op('iny dey', 'Y', 'Y Z N'); op('inc dec', '', 'Z N')
op('clc sec', '', 'C'); op('clv', '', 'V'); op('cli sei cld sed nop', '', '')
op('bcc bcs', 'C', ''); op('beq bne', 'Z', ''); op('bmi bpl', 'N', ''); op('bvc bvs', 'V', '')
for n in ('asl', 'lsr', 'rol', 'ror'):
    R[n] = None   # depends on the operand

def effect(r):
    m = r.get('m', '')
    o = str(r.get('o', ''))
    if m in ('asl', 'lsr', 'rol', 'ror'):
        acc = o in ('', 'a', 'A')
        reads = set(['C']) if m in ('rol', 'ror') else set()
        if acc:
            reads.add('A')
            return reads, set(['A', 'C', 'Z', 'N'])
        return reads, set(['C', 'Z', 'N'])
    e = R.get(m)
    if e is None:
        return set(), set()
    reads, writes = e
    reads = set(reads)
    if ',x' in o.lower() or 'x)' in o.lower():
        reads.add('X')
    if ',y' in o.lower():
        reads.add('Y')
    return reads, writes

recs = []
for part in PARTS:
    L = json.load(open(os.path.join(GAME, 'parts', part, 'listing.json')))
    for r in L['records']:
        if r.get('t') == 'code':
            r = dict(r); r['part'] = part
            recs.append(r)
by = {}
for i, r in enumerate(recs):
    by.setdefault((r['part'], r['a']), i)
labels = {}
for r in recs:
    if r.get('l'):
        labels.setdefault(r['l'], r['a'])
subs = set()
for part in PARTS:
    S = json.load(open(os.path.join(GAME, 'parts', part, 'symbols.json')))
    for s in S['symbols']:
        if s.get('type') == 'Subroutine':
            subs.add((part, s['address']))

def routine_of(i):
    """the subroutine the instruction at index i is in: the nearest Subroutine entry above it"""
    part = recs[i]['part']
    j = i
    while j >= 0 and recs[j]['part'] == part:
        if (part, recs[j]['a']) in subs:
            return recs[j]['a']
        j -= 1
    return None

def after(i, seen):
    """registers and flags read before set, following the code from index i"""
    done, used, why = set(), set(), []
    while i < len(recs):
        r = recs[i]
        m = r.get('m', '')
        reads, writes = effect(r)
        for x in reads - done:
            used.add(x)
        done |= writes
        if m == 'rts':
            sub = routine_of(i)
            if sub is not None and sub not in seen:
                u, w = uses(sub, seen | {sub})
                used |= (u - done)
                why.append('$%04X rts -> callers of $%04X' % (r['a'], sub))
            break
        if m in ('jmp', 'rti', 'brk') or m.startswith('b') and m not in ('bit',):
            if m.startswith('b') and m != 'bit':
                # a branch: follow the fall-through only
                i += 1
                continue
            break
        if m == 'jsr':
            # the callee may read or set anything: stop here
            break
        i += 1
        if i < len(recs) and recs[i]['a'] != r['a'] + len(r.get('b', [])):
            break
    return used, why

def uses(addr, seen=frozenset()):
    used, why = set(), []
    for i, r in enumerate(recs):
        if r.get('oa') == addr and r.get('m') in ('jsr', 'jmp') and not str(r.get('o', '')).startswith('('):
            if r['m'] == 'jsr':
                u, w = after(i + 1, seen)
            else:
                sub = routine_of(i)
                if sub is None or sub in seen:
                    continue
                u, w = uses(sub, seen | {sub})
            used |= u
            why.append(('$%04X %s %s' % (r['a'], r['m'], ' '.join(sorted(u)))) + (' (' + '; '.join(w) + ')' if w else ''))
    return used, why

if __name__ == '__main__':
    t = sys.argv[1]
    a = int(t[1:], 16) if t.startswith('$') else labels[t]
    u, why = uses(a, frozenset([a]))
    print('$%04X uses: %s' % (a, ' '.join(sorted(u)) or '-'))
    for w in why:
        print('  ' + w)
