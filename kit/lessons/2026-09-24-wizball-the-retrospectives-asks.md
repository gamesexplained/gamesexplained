## 0.0.20 · 24 September 2026 · Wizball, the retrospective's asks · air with Claude Opus 5.5

**Record the frame; do not rebuild a split screen by hand.** Wizball's
rebuilt frame took half an hour of its run: registers read at every
interrupt, and a line renderer written for the one game. Every
split-screen game needs the same. `kit/c64/frame.py capture` now records
one whole frame: every write to the video chip, the video bank and the
sprite pointers, with the line and cycle it happened on. `C64.renderFrame`
in the site's library draws it cycle by cycle, and `compare` checks the
drawing against the emulator's own picture of the same frame. On the
kit's own split-screen test program, and on six frames from five of the
games here, every pixel matched except a handful at mid-line changes of
mode or scroll. The minisite skill now starts there, and the platform reference
has the chip's timing as measured.

**A search for the readers of an address decodes every opcode.** One of
Wizball's agents reported that nothing reads the NMI watchdog byte; three
others found the two checks that do, in undocumented opcodes the
disassembler shows as data. `kit/c64/opcodes.py --refs <address>` lists
every instruction that can touch an address, documented or not, including
an index that carries an absolute address past `$FFFF`. On Wizball's
listing it finds all five instructions that touch `$85` in one pass, and
the verify skill now sends a negative result through it.

**100 % is of what the ledger can see.** The ledger counts what code,
symbols and `game.json` name, and nothing else. Wizball's first 100 %
left out 4 KB of sprites under the I/O area. Run on Little Computer
People's hand-over and play snapshots, the new check in `listing.py`
found 1.6 KB of that game's own tables and its picture's colours outside
its 100 %. `listing.py` now lists such data after every build, and the
coverage skill says to go through the list before calling 100 %.
