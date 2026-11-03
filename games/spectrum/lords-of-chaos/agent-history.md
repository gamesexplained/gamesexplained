# Lords of Chaos — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 2-3 November 2026: the run to Silver

**Orientation.** The TOSEC `.tzx` (no flags) loads in ZEsarUX 13.0 as a
48K Spectrum; the `.tap` in the same set carries a cheat loader and was
left alone. The engine loads to `$606E`-`$E220`, and the designer and the
three scenarios each load at `$D003` over the same header, so the game
became five parts: the engine (`$4000`-`$D002`), the designer
(`$D003`-`$E220`) and three scenarios (`$D003`-`$FFFF`). Play snapshots of
each scenario, and of the designer, were taken by driving the menus
through ZEsarUX's remote port (`work/scripts/drive.py`).

**Coverage.** Static tracing (`kit/spectrum/codemap.py`) found most of
the engine; execution maps recorded live by ending turn after turn in
each scenario (figures in `facts.md`, "Live tests") decided what the
static reading could not, chiefly the scenario hooks the engine calls
through the header's JP slots. A first pass of those maps marked the
scenarios' start-up code at `$FE03`-`$FF30` as code in the engine's
snapshot, where it is garbage: the engine's map now skips `$D003`-`$FFFF`.
The scenarios' IM 2 vector at `$FFFF` holds a JR whose offset is the
ROM's first byte, which crashed both codemap.py and listing.py; both were
fixed in the kit with a test each. The parts' build script takes its end
address as exclusive: given `FFFF`, it dropped the last byte, and `10000`
is right. The designer's symbols needed `--force` once, because its
header bytes are the same as scenario 1's and an unused label there would
otherwise have been lost.

**Verify.** A checker (the same model, briefed cold, writing none of the
comments) sampled 80 of 1,129 comments with seed 7061 and found 12 wrong,
all in hand-written comments: 15 % plain, 18.7 % weighted, over the mark.
Each was corrected with every comment that said the same, across parts.
The commonest kind was a list of cases left short (`kit/lessons/2026-11-03-lords-of-chaos.md`).

**Pages.** The How it works page ports the map window, line of sight,
combat and the sound routines, each held to the game's code. The
Discoveries page started with seven findings, four of them checked live
in the emulator (LOAD's first-letter match with a two-file tape, the
designer's lost points, the authors' breakpoint called by hand, the
vials' strength in a fresh game). Opening a tape in ZEsarUX after loading
a snapshot reset the machine; opening the tape first and then loading the
snapshot works.

**Two findings from the Maps page.** Drawing each scenario whole, and
testing what the page reads against the game's routines, turned up two
things the listing had wrong or had missed. The trip squares had been
annotated as waking their creatures when stepped on; trip_square's
callers showed that only a change to the square does (a door unlocked,
opened or closed, a chest opened, a terrain set). The comment in the
header and the scenarios' generated text were corrected. And reading the
routes the way waypoint_square does, with no check on the number, put
waypoint 28 of three of scenario 2's routes on a rock wall: an eighth
discovery, tested by running computer_choose_target on the game's code.

**Left open.** The Play tab, a port of the whole game for Platinum.
