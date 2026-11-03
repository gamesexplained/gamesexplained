# Falcon Patrol — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## The frozen machine that was not frozen

Finding the in-game input reader needed a load watchpoint on `$DC01` with
`stop` set. That found it — `$5700`, called from `$419A` — and it also
opened VICE's monitor, which pauses the emulation and keeps it paused
after the checkpoint is gone.

Nothing said so. `vice_ping` kept reporting `"execution": "running"`.
Screenshots kept showing a plausible frame of gameplay. Memory reads kept
returning steady, sensible values. Checkpoints all reported zero hits.

Working from that, I concluded that this game's main loop could not
survive a snapshot restore: that CIA2 Timer B came back stopped, so the
frame-pace spin at `$41C0` never exited. It explained everything I could
see. I wrote it into `facts.md` as a live finding, put it in a commit
message, and wrote a kit-feedback item recommending that `10-orient` be
amended to describe it. I also restarted the emulator process to work
around a problem that did not exist.

The contributor, who could see the VICE window, said the monitor was open
and that closing it would bring the emulation back. Re-tested with no
stopping checkpoint anywhere, a restored snapshot runs perfectly.

Two things worth keeping from it. The first is that every symptom pointed
at the game and none of them pointed at the rig, which is precisely when
"distrust your own negative results" is hardest to apply and most needed.
The second is the cheap test that would have caught it in one call:
sample the program counter several times. A live machine returns a
scatter of addresses. Mine returned `$41C5` six times in a row, and I read
that as evidence about the game rather than about the machine.

## 3 November 2026: the Graphics tab

- Aaron Bell asked for Graphics tabs on the older pages that no
  contributor had shaped. `graphics.html` draws every sprite block from
  the listing in the colours of the register image at `$4310`, and steps
  each one at the game's 30.1 ticks a second as the code does: the turn
  `$80`-`$86` every fourth tick (`$5600`), the bank's ten pictures copied
  over `$80` and `$86` every eighth tick at full speed (`$5A20`), the
  enemies' two sets of five every eighth tick (`$4340`), the debris picked
  from the noise generator every tick (`$43BC`, `$5690`) and the smoke on
  sprite 7. A sheet of the 32 blocks and the bank marks what uses each.
- Building it corrected three sets of notes. Blocks `$90`-`$93` were
  called an exhaust plume: `crash_sequence` (`$5690`) shows them on
  sprite 7 only while a shot-down aircraft falls, so they are smoke, and
  the labels are now `sprite_smoke_N`. The debris blocks `$88`-`$8F` and
  the smoke are shown multicolour (`$D01C` = `$80` from the start, and the
  code that points a sprite at the debris sets its bit at `$43B4` and
  `$56B9`), where the notes had them hires. The bomb's note still had a
  template's placeholders; it now says what the block holds.
