# Mercenary — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 25 September 2026: setting up and orienting

The run was a cloud session with no disk image on the machine at first;
the contributor uploaded `MERCENAR.D64` into the session. Their Google
Drive held only `Mercenary III.adf` (the Amiga sequel), so the first
question was which copy and which platform; the upload settled both.

The emulator was the v3.13.1 Linux release zip (with fourteen runtime
libraries from apt), and passed all 56 checks, so no workaround applied.
`check-emulator` leaves the machine paused: the first autostart after it
did nothing until the machine was resumed.

The disk's `MERCENARY` turned out to be a packed one-file build: a BASIC
`SYS` line naming "COMPACKER V2.0", a depacker in the stack page, BASIC's
own `RUN` of the unpacked program (`1999 SYS 2065`), a run-length stage at
`$B98B` that decodes downward from `$CFFF`, and a copy at `$5000` before
the game's start-up at `$7200`. Three wrong turns on the way:

- A stopping checkpoint on `$B98B` fired inside BASIC's ROM while the
  `SYS` line's number was being converted, with `$01` = `$37`; the
  snapshot taken there was useless. Stopping on the `SYS` target `$0811`
  and stepping five instructions reached the real `$B98B`.
- The first hand-over snapshot held leftovers of the previous boot under
  the KERNAL: an autostart resets the CPU but keeps RAM. A power cycle
  (`vice_machine_reset` with `mode: hard`) before the boot gave clean RAM.
- `$5000` was taken for the game's first instruction; it is a copier, and
  the start-up at `$7200` and the two blocks it copies from exist only
  until the second bitmap overwrites them, so the image to read is the
  machine stopped at `$7200`, after the copy.

The pointer at `$0800`, which the `SYS` stub sets by storing `$6C` at
`$0800` before jumping on, is the first script's address: the stub is not
the packer's decoration but part of how the game finds its opening script.

## Features and text

A research agent read the manuals, Zzap!64 and the fan sites in parallel
with the orientation. It reported the Mercenary Site unreachable: its
fetcher upgrades plain HTTP to HTTPS, and the site serves HTTP only.
`curl` over plain HTTP reached it, so its pages were read directly
afterwards.

The string sweep found words ending in a character with bit 7 set, not
whole messages: the messages are token lists over a dictionary. Decoding
the pointer tables at `$2120`/`$2210` took two tries: the words start one
byte after the address the table holds (the printer's index starts at 1),
and words 1-7 are endings printed with no blank before them ("LAND" + "ED").
The one conflict in the documentation that the code could settle at once,
T or P to take an object, went to T (`$970A`).

## Coverage

Twelve annotation agents (the same model as the lead) took disjoint
ranges: variables, the scripts and text, three data ranges, the start-up
and panel, and six code ranges of about 2.5 KB each.

Midway, the emulator had to be restarted: switching it to NTSC and back
for the PAL test left every earlier snapshot refusing to load. The restart
used the bare `tools.py stop`, which also stopped the disassembler twelve
agents were writing to. The session was rebuilt from their logs (each
replayed to its length at the stop, then the rest appended), about ten
minutes lost; the agents were told and went on. The kit now says to stop
the emulator alone.

The agents' first guesses about the data mostly fell: the four tables at
`$2C00` were taken for building pointers and are the roads (the building
pointer is `$2600`/`$2700`); `$2B00` was taken to be per object and is per
square; the fill loop at `$2170` was taken for copy protection reached
after a load, and is the reset trap, which the original disk's `CBM80`
signature arms. Two agents disagreed on script 10 (which branch pays the
500,000); the script's inverted test settled it. The Source tab showed the
script table shifted by a byte, because code reading `$0801,Y` mints a
symbol on the first entry's second byte; `listing.py` now keeps such pairs
whole.

## Verifying

The agents' suggestions for live tests were the best source of findings.
Agent 9 wondered whether E at ground level at 08-08 would give "a free
ride": it does, into the Colony Craft's hangar and up to its deck. Agent 6
noted that the hit follow-up ignores hits outside the player's square: a
first test from the ground failed because the missile sinks into the
ground before it gets there (the level pitch's sine is not quite zero),
and from 1024 units up the building fell with no count and no message.
The TRAITOR sign was checked by flying the bought Dart to 13-04 and firing.
A reader's report in Zzap!64 15 of a crash above a million credits was not
reproduced.

## The minisite

The minisite's widgets were split among five agents: the city in 3D, the
underground, the arithmetic and line drawing, Benson's messages and
scripts, and the flight model. Each ported the game's routines and tested
the port against the game's own code in a 6502 simulator on the snapshots:
the city's view on 18,000 random views, and against the stadium view's
displayed bitmap, byte for byte; the rooms in 2,942 views; the floats on
millions of operand pairs and 4,680 lines; the printer on every frame of
219 messages; the flying step on 1.2 million passes and on a 253-pass
recording of the Dart. The lead wrote the frame, the secrets, the
controls, the opening and the odds and ends.

The ports corrected `facts.md` in a dozen places. The top speeds, first
worked out in exact arithmetic, came out as Zzap!64 13's table to the
digit once the port truncated as the game's floats do. The ceiling
replaces the climb's power of two rather than halving it, so every craft
has a hard top, and the Dart's is ALT 24000, below the Colony Craft.
Room lines are drawn in the ORA form. The model count had counted the
road pieces twice. The rebuilt frame of the descent showed the roads in
the fourth colour, which is how the ORA form on the roads was noticed.
The flight agent pointed out that the other agents' random tests used a
multiplier that loses its low bits in JavaScript's doubles; the tests
were rerun with `Math.imul` and still pass. The flight port also predicted
that reverse thrust lifts a craft off with the nose level, and the
emulator confirmed the heights to the unit.
