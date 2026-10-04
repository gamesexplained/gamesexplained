# Way of the Exploding Fist — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 2 October 2026, the Silver run

**Booting.** The G64 loaded under VICE's default true drive emulation
with no `vicerc`, but slowly: about four minutes of warp from a cold
boot to the Melbourne House menu on this container, then 16 seconds of
warp after pressing `1`. The hand-over was found by arming a stopping
store watch on `$FFFE/$FFFF` before the key press: it stopped inside
`$1943`, the vector set-up, and the backtrace led to `$1AED`, whose
return address on the stack (`$E146`) showed it had been entered through
BASIC's `SYS`. A checkpoint at `$1AED` then caught `work/entry.vsf`.

**A misleading first play snapshot.** The first snapshot was taken while
the computer, unopposed, was already winning the bout; a few seconds
later the game was back in the attract mode, and the snapshot saved after
that was attract mode, not play. The usable one was taken 1.2 seconds
after the fire press. The first snapshots also came from a boot after the
emulator's own test program, so the boot was repeated after a hard
reset.

**The web was closed.** Every page fetch (C64-Wiki, the Internet
Archive, Wikipedia) was refused by the session's proxy; the features
list rests on web search summaries and the game's own screens.

**Text was not a problem.** The panel prints plain ASCII codes through
the game's own font, so the strings were found by a plain search; only
`DEMO` is written with immediates.

**Fist II helped little.** A byte map against the annotated Fist II in
this repository placed only the mirror table, the music's note tables, a
few computer-opponent masks and some set-up code: the two games share a
programmer and a few tables, not an engine.

**Six agents.** The traced code ran from `$09A5` to `$3E7F` with two
indirect jumps (the music's order commands at `$0D31`, the computer's
plans at `$2774`); seeding their targets completed the trace. Six agents
took `$0400`-`$0FFF`, `$1000`-`$17FF`, `$1800`-`$1FFF`, `$2000`-`$27FF`,
`$2800`-`$2FFF` and `$3000`-`$3FFF`; the lead took everything above
`$4000` and zero page. Each reached 100 % of its range in 10 to 14
minutes. Their reports corrected the brief in three places: the NMI is
CIA 2 timer B, not A; the raster lines in the brief were where each
vector was written, one handler early; and `$2115`/`$2186`/`$228A` draw
the panel, they are not the fighters' work (`$2808` is). Agents 1 and 6
each found data in a neighbour's range (song order lists and instruments
at `$1007`-`$1158`, raster-handler code at `$2E4C` and `$2F59`), passed on
through the lead.

**The data above `$4000`.** A load watch found the backdrop unpacker
reading `$4000`-`$71FF`; re-implementing both unpackers in Python
reproduced the snapshot's backdrop byte for byte and drew all four
pictures. The fighters' cells at `$8000` and the tables at `$7200`-`$7FFF`
came from agent 6's reading of the sprite builder. The bull's sprites
turned up scattered through memory nobody looks at, past the build
buffers at `$C940`, under the I/O chips, and inside the unused codes of
the font at `$E000`, found by listing the cells of the bull's frames,
which the builder uses as pointers when `$5D` is `$40`.

**Two wrong turns, both caught.** A store watch on `$0200`-`$03FF` from
the hand-over saw nothing, although `$18F8` plainly copies 512 bytes
there; the copy runs from `$18E8`, which the hand-over snapshot stops
just before, so the watch should have fired, and why it did not was not
worked out. The code read settled it. Second, the speech period table
was first credited to the file `m.spchtbl` because the two begin alike;
matching every file against the snapshots showed it is `m.prerun`, byte
for byte.

**The clock.** Agent 4 wrote the bout clock as seconds on the
assumption that the exchange loop runs once a frame. Exec checkpoints
over 250 frames showed it does not (195 passes), and timing the clock
gave 50 to 66 frames a unit, so the comments now say units.

**Live tests** forced the bull round by poking the stage, the wins
needed and the halves, then landing one blow; the bull floored an idle
player, and a crouch followed by down-forward at 28 units felled it at
26. A blow with CIA 2's timer A running crashed the game, as agent 5's
reading of `$2CAE` predicted.
