# Skate Or Die — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## Town navigation and overlays

The first High Jump load suggested all right-hand town paths might be on
side 1. Later Jam and Race loaded with side 2 mounted. Returning to High
Jump with side 2 mounted produced the explicit `INSERT SIDE 1 AND PRESS
BUTTON` prompt, and the load resumed after a side swap and joystick fire.
Do not infer a disk-side map from the directory: side 1 lists only `EA`, but
the loader reads further tracks directly.

Early town navigation held left or right for seconds, causing apparently
random results. The manual's "forward in the direction you face" is
literal: up moves forward, while left and right rotate. VICE frame advance
gave reproducible routes in `orientation.md`. The central `DOWNHILL` sign is
not itself an event entrance; the separate lower-left and lower-right paths
lead to Race and Jam.

Several attempts to reach Freestyle by steering around the right side
entered High Jump. A town snapshot taken before the High Jump gate changed
only 324 RAM bytes from the initial town state. `$2F/$30` tracked the skater
sprite: writing them in a restored snapshot moved the sprite after two
frames. Poking coordinates beside the Freestyle label and skating forward
still selected High Jump, even when the upper lane was used. The remaining
selection state or path logic has not been identified, so do not present
this as a Freestyle capture. All modified states were throwaway snapshot
loads; the source images and saved clean snapshots were not changed.

The first High Jump flow trace covered 2,018 code bytes, but the ledger
tracked only 3,612 bytes in total and initially explained 1.1%. Describing
raster work, sound scheduling and graphics routines improved the figure,
but it remained a fraction of the High Jump image, not a whole-game
measurement. RAM comparisons between event snapshots differed in more than
50,000 byte positions and confirmed that the events need separate analysis.

The first sound trace stopped at `$2394`, which dispatches via an RTS target
from split tables rather than a direct jump. Seeding its ten distinct
targets exposed a second dispatch table at `$27ED/$27F8`; seeding those 11
targets expanded the High Jump listing from 996 to 1,628 instructions. This
is why a low early code count was not evidence that the rest of the overlay
was data. No bytecode behavior was named until its handler was read.

The phase table at `$2AB9` exposed nine handlers. The first flow trace from
them decoded inline text after `JSR $1242` as repeated `JSR $2020`, then
invented an edge to `$4150`. Reading `$1242` showed that it consumes the
NUL-terminated `PASS:`/`HEIGHT:` string after its call and resumes at
`$09CA`. The string was retyped as bytes, `$4150` was cleared to undefined,
and disassembly restarted at `$09CA`. High-RAM `$Fxxx` code was retained:
there are actual calls and data references to that area while the KERNAL
is banked out, and its RAM bytes differ from the ROM bank. Its loader and
play roles remain to be separated.

## 4 October 2026, High Jump to Silver

The run restarted on the kit's newer layout: the clock and `timings.json`
had gone, and the earlier coverage figure (34 %) measured an image that
mixed High Jump with leftovers from other loads. Under the interim policy
of one declared load per game, High Jump was chosen: it loads whole from
side 1 and reaches play without a disk swap.

Seven agents annotated disjoint ranges of `work/highjump-play.vsf` with an
executed-address map from seven simulated practice runs as a floor. The map
mattered most for the sound scripts and the music: their machine-code
helpers are reached only through the bytecode, and one (`$3530`) was typed
as data until an agent decoded the scripts.

The inline text after `JSR $1242` at `$099E` was turned back into code
twice, once by a trace that entered from outside the owner's range. Each
time it produced a `JSR $2020` and a code block inside the bitmap at
`$4150`; both were set back to bytes and the brief carried a warning.

Several leads in the brief were wrong and the agents' reports corrected
them: the NMI vector at `$0A3A` is a stale value, not a sample player; the
"wait near `$FE46`" at the end of a run is the PRACTICE AGAIN screen
waiting for fire to be released, not the drive; the `$E4` read at `$0001`
is the RAM under the CPU port, whose real value is `$25`; and the
earlier name `height_cell_animation` belonged to the crowd. The old
session's `initial_sound_scripts` at `$2287` were the driver's call
stacks.

An earlier session's live run showed 14'11" in the air and 0'0" at the
end. The code explains why the figure can drop: the height belongs to one
pass and is cleared when the next pass begins, and a fall clears it too.
Live runs this session showed 47, 75 and 95 eighths on three passes, each
cleared at the next takeoff, and fire at the top of a pass keeping its
figure.

The comment audit found four comments with a wrong detail (`$16E3`, `$3291`, `$F4B7`, `$FF3F`); the auditing agent rewrote each in the disassembler. Two more came from checks while writing the pages: sound 15 had been described as never queued, but `ramp_bottom_sounds` (`$172E`) queues it, and the music's seed, described as left over from earlier loads, turned out to come from the disk with the event's file and to move on with every use (`$358D`).

## The whole game (5 and 6 October 2026)

The contributor asked for every load after High Jump reached Silver. The
town route to Freestyle was never found by steering; instead the event
manager's own entry `$F99C`, with X = the load-table row, loaded each event
from the High Jump snapshot (`orientation.md`). Entering past the side check
at `$F9E4` crashed. Each part got its own regenerator2000 instance on its
own port (`KIT_R2000_PORT`, 3001-3007) and its own agent; a container
restart killed four of them, and their annotation logs replayed into fresh
instances (`r2000.py --replay`) let them resume without loss.

Main's kit then changed to one `part.json` per part with "over" (PR #202),
and the run moved to it: the shared loader and manager became the
`resident` part, each event "over" it owning `$0000`-`$F22F`. Importing an
over-part's symbols failed with overlapping blocks, so each part's
`symbols.json` was clipped offline with `parts.clip` (`work/reclip.py`).
The title's first snapshot had been taken mid-load; it was replaced by one
waiting for fire, and the old one kept as `play-loading.vsf`.

The pages were first handed to seven agents at once; a restart lost them,
and after main's kit asked for one agent by default the pages were written
by the lead alone from the parts' facts, with one independent agent for the
comment audit.
