# Platoon — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 7 October 2026, Bronze run

Euan supplied six G64 images: sides 1 and 2 in a PAL dump, a second PAL
dump ("alt", disk name `rouven ross`) and an NTSC v1.1 dump. Extracting
every file with `c1541` showed the two PAL dumps byte for byte the same
file by file, and the NTSC disks a different build, so the run took the
PAL disks.

The emulator release needed six runtime libraries in this container
(`get-vice download` named them); with those it passed 57 of 57 checks.
regenerator2000 built from crates.io in the background while the game
booted.

The loading screen waits on SPACE with a loop at `$11F2`; sampling the
program counter found it, since the screen gave no prompt. The first play
snapshot was taken during the black screen between the title and the
jungle and was redone. A CHOOSE YOUR MAN panel opened by itself twice in
the jungle; fire closed it.

The hand-over is OVL1's first byte, `$0400`; F patches a `jmp $0400` into
the loader it copies to the stack page. OVL1 lands whole there, the RAM
under I/O included, so `entry.vsf` is the listing's image.

The flow trace from the stack page code at `$0108` (the NMI handler's
other exit) marked zero-page bytes as code; `$0000`-`$01FF` was set back
to undefined.

Raster interrupt handlers were first described by the raster line of the
write naming them, which is the line of the handler before; the comments
were rewritten from what each one writes.

The key test `$BA6A` takes a key number; listing its 23 callers with the
number before each found F1 to F7 (soldier select), Y and N, RUN/STOP,
M, O, 5, 6 and 2 (not yet read), and the five keys Z, A, C, H and 1 at
`$07B5`. Holding them live changed `$2BC8` to `rts`. The first try read
nothing because the machine had been left stopped by an earlier script
and `snapshot_load` keeps it stopped; checkpoint counts at zero, the
control included, showed it.

Every web page fetch was refused by the proxy (403); `features.md` rests
on search summaries and the game's own screens.
