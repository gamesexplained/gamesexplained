## 0.0.16 · 24 September 2026 · Master of Magic · air with Claude Opus 5.5

**Test the reset as well as RESTORE.** The game writes the `CBM80`
signature so that both restart it, and both did, but after a reset the
title came up in the wrong colours. A reset clears the 6510's data
direction register, the KERNAL jumps through `$8000` before it would set
it again, and the game's restart never does, so its write to `$01` changes
nothing and BASIC stays switched in over the game's tables. Reading `$00`
after the reset settled it in a minute. The platform reference now says
to test the reset path separately and read `$00` and the CPU's view of
the game's data after it.

**List what a test lets through.** The best secret in this game came
from asking which values a compare accepts rather than which it was
written for. The menu's door test is a signed compare, so every
character code below `$70` passes as a door too, and the edge of a pool
is such a code: standing there offers OPEN. The same question found two
weapon bonuses that can never apply, each testing one register against
two values in turn. The verify skill now asks for the accepted values
of every classifying compare, and a search of the data for the
unintended ones.

**A port is tested against the game.** Three mechanics went onto the
page as JavaScript: the line of sight, the creatures' movement and the
music driver. Each was checked before it was published, the creatures
against a pass-by-pass trace of the game's own variables recorded in
the emulator (400 passes, 1.8 million values), the music against the
original driver code run in a 6502 simulator on the snapshot (every
sound register, every frame), and the line of sight against a second
implementation and two screenshots. Then the whole game was ported for
a Play tab, and the game's own demonstration, a recording of input,
tested all of it at once: fed that input poll by poll, the port
reproduced the real demonstration's run for all 2,371 passes of the game
loop, byte for byte. The minisite skill now asks for this kind of test,
and the emulator notes say how to record the trace.

**Rebuild a picture before naming its mode.** The coordinator's brief
called the title screen character mode, from one write to `$D018`; it
is a multicolour bitmap, which two agents proved by drawing it from
memory and matching a screenshot. The platform reference now says how
bitmap mode reads `$D018` and that a raster split can change the mode
per band.
