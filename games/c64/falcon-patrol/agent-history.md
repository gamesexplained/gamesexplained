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
