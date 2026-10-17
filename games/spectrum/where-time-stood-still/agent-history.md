# Where Time Stood Still — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 17 October 2026: the run, in one session

The first 128K game through the kit, in a hosted Linux container, with
another provider's model as the checker through OpenAI's Codex CLI and
the contributor's ChatGPT subscription (the models are in `game.json`).
Kit 0.0.185.

**The image.** TOSEC has two clean tapes of Ocean's release; their blocks
carry the same bytes with different pulses, so the plain one was used.
ZEsarUX 13.0, started with `--machine 128k`, plays the SpeedLock 4 blocks
in real time: about nine minutes. The paging sampled every few seconds
during the load showed which bank each 16 KB block went to. The hand-over
was found by loading again at warp, stopping on the game's first
interrupt and reading `cpu-history` backwards: the loader jumps to a stub
at `$5B00`, which pages bank 0 and ROM 1 in, moves the program up by
`$500` and jumps to `$8521`. `work/entry.py` makes `work/entry.sna`
there.

**What the kit could not do yet, and now does.** `snapshot.py` refused a
128K `.sna`; it now reads it and hands any bank out at `$C000`. The client
stepped frames of 69,888 T-states, the 48K's, on the 128K, whose frame is
70,908: every frame stepped ended 1,020 T-states early, so input held
"for ten frames" drifted against the game's interrupt. That was silent; it
was found reading the client before the first input. ZEsarUX's code
coverage lists bare addresses, and one at `$C000` or above can be in any
bank, so `kit/spectrum/bankmap.py` records the bank from the transaction
log, through a named pipe (the log is about 2 MB a frame). ZEsarUX opened
the log for reading before writing it, and on a pipe that open waits for
a writer: the emulator hung until a dummy writer opened the pipe for a
moment, which `bankmap.py` now does itself. The recording showed code at
`$C000`-`$FFFF` from banks 3 and 0 only, so the other banks are data.
`kit/spectrum/banks.py` made a part for each bank the CPU did not see at
the hand-over, and `codemap.py` learned `BANK:ADDR` tokens.

**Annotation.** `main` first (the sound driver, start-up, title, the area
loader, the scrolling view and its block renderer, sprites, windows, the
clock), with bank 0 inside it, then bank 3, whose 12 KB of code were found
through its jump tables, then the data banks 1, 4, 6 and 7.

**The checker.** The Codex usage limit held the sample until 04:01 UTC, so
the 60 comments were drawn from `main` and bank 3, the parts finished by
then. 18 were wrong in a detail; all were corrected with the comments that
repeated them (`facts.md`, "The listing's error rate").

**Live.** The calendar's MAY 1 after 31 May was seen by poking the day to
31 and the clock to just before midnight.

**The pages, and what they caught.** The music player runs the game's own
driver on the kit's Z80 and records what it writes to the AY. The first
comparison with ZEsarUX's registers, read once a frame with
`get-io-ports`, failed: the emulator's frame step can stop while the
driver is writing the chip (`$7B05` writes registers 0 to 6, 8 to 10,
then 7), and the second tune's request had been replayed one call late.
Allowing for both, 3,949 of 3,950 frames matched for each tune. The site
had no AY model; `site/lib/ay.js` was written for it and measured against
ZEsarUX's own sound, from a second emulator started with `--aofile`. That
emulator refused to step: a fresh ZEsarUX keeps running after
`snapshot-load` and refuses `run` until `enter-cpu-step`, and the client's
`frames` said only that it had not reached the frame in 20 tries (it now
says to call `enter_step`). The model's first pitches were an octave low,
the chip stepped at clock / 16 rather than clock / 8, and `test_ay.js`
against the measurement caught it.

The view's renderer drew the wrong characters for the higher-numbered
blocks in the first area tried. The annotation had read the split
between the two halves of the block tables as `$80`, the operand of the
CP at `$9C12` in the snapshot; the area loader rewrites that operand for
each area (`$882C`). Running the game's `$87CF` and `$A012` on the kit's
Z80 and comparing the view buffer byte for byte found it, and
`test_maps.js` keeps the check. The same reading of a written operand as
a constant was in `translate_cell`'s comment (`$8B39`, written at
`$89C1`), corrected when the facts were written. The recordings also
corrected the tune's section numbers (15 to 26, not 15 to 29) and showed
the title music climbing a semitone after its first time round.

**Claims taken out** because nothing checked supported them: that port
`$7F` is a Fuller box (recalled, and in no reference the kit has), that
CAPS SHIFT's reset was left in by the developers, and that a second
effect request replaces the first.
