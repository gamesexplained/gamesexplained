# Publication history

30 September 2026: contributor authorized publication directly from the existing exhaustive disassembly, online research, and a separate PR for each game. Imported annotations without claiming a new reverse-engineering run. Measured the repository’s own prose coverage and retained Bronze pending completion and maintainer review.

1 October 2026: fresh male name-prompt boot and final $4000 hand-over. Code/word comparisons and rerun VM decoder reproduce imported records. Extended the verified hidden VM mirror to all 2,048 bytes at $D800-$DFFF, removed misleading hardware names from physical RAM and annotated compiled-procedure bodies. Removed parallel overlay/text publications; they remain private leads.

## 1 October 2026 — independent data checks and listing corrections

One agent independently decoded male MAP1 with a whole-phrase dictionary and integer bit groups, then compared every prefix/suffix byte, all boundary words and the cached descriptor with fresh physical RAM. This disproved the imported buffer/token/projection interpretation. Native bit reader, growth branches, cache-hit/miss boundaries, glyph copies, questionnaire, heap, division wrappers and primitive zero supplied controlled positive checks. Ordinary matrix typing/deletion/limit/Return exercised the name editor.

The first questionnaire harness used an unsuitable input buffer overlapping system vectors, and a step-over result was read before one call had reliable complete output. The final harness moved input into private retained workspace, stopped explicitly at a native return checkpoint, checked all state words, and passed 60 profiles. An unsupported matrix key name was replaced with the documented DEL row/column. A breakpoint on a VM bytecode address cannot detect execution of that opcode: the interpreter fetches it as data. Native helper checkpoints were used for the three cache cases.

Recovered 161-byte signed/unsigned division helpers from byte data, tested all four wrappers, and rebuilt Source from the updated live project and canonical snapshot. Added complete allocation extents to the ledger and named unresolved boundaries; this exposes more bare data instead of hiding it behind nearby comments. The questionnaire, glyph and heap widgets match the native outputs; article copy received a separate final pass. Private originals remain unchanged.

PR #118 merged during this continuation. The verified corrections were moved onto a fresh branch from main at kit 0.0.48; the canonical snapshot and checked Source bytes were retained.

## Review correction, 3 October 2026

Removed the inherited “Thirty byte-data bytes differ” claim from facts
and orientation: it did not identify a reproducible pair of captures or
separate mutable state from loaded data. The recorded hand-over/name-prompt
comparison is the evidence retained instead. Questionnaire harness calls
are confirmed, not live UI completion. Compressed text uses two initial
nine-bit codes before switching to ten-bit groups; the heap example now
names the expression-stack pointer at the guard comparison.

## Typed data no label reached (22 October 2026)

The ledger began counting typed data that no label's reach covers, and
4,426 bytes in twelve stretches were bare, missing from the listing.

The contributor's disk ("male disk 01a", with an FNC introduction) was
not to hand, and none of the archive's copies checked carries it: the
C64 Preservation Project's original `alter_ego_male_s1[activision_1987](!)`
has no crack stub at `$0801`, and the TNC and "Up" disks start with a
different one. The original disk, taken by the same route to the name
prompt, runs the same program: `$4000`-`$7FFF`, the MAP1 resources at
`$E000`-`$E5FB` and `$E800`-`$EBFF`, and the program object at `$8466`
agree with the listing byte for byte (but for `$9990`/`$9991`). The
loader and stub at `$0800`-`$1FFF` and everything at `$C000`-`$CFFF` do
not: there its name prompt leaves the power-on pattern, where the
contributor's capture holds a decoded scene-26 descriptor.

So the bytes were taken from it only where it can be trusted: the zeroed
words of the state vector and the area before it (`$7E9F`-`$7FCA`, whose
listed neighbours agree but for the month count at `$7FC4`), the last
file-binding records (`$8000`-`$8018`), the last two question pointers
(`$942A`-`$942D`, in the matching program object), and the rest of the
MAP1 graphics resource (`$EC00`-`$F9CF`, found on the TNC and "Up" disks
in 32-byte pieces beside the `$E800`-`$EBFF` that already matched). Each
stretch has a line comment; the question pointers' word block now runs
to `$942D`. The other 22,067 bytes of the new snapshot that differed were
written back from the listing, then the listing was built from it and
the two cache stretches, `$C29C`-`$C2A1` and `$C82C`-`$CAAA`, were taken
out again (`listing.py --rebuild --write`), so they show as missing
rather than as the original disk's power-on pattern. The raw snapshots
are `work/entry.vsf` and `work/name-prompt-raw.vsf`.

## The cache bytes from their twin (22 October 2026)

The two cache stretches left missing above came from the contributor's
capture after all. The bootstrap at `$0E98` copied `$1000`-`$1FFF` up to
`$C000`-`$CFFF`, and `facts.md` records that in the contributor's
name-prompt capture the two halves differ in 52 bytes, all in the VM
stack tail from `$CF83`. The listing holds 3,451 of the 4,096 byte pairs,
and they differ in exactly those 52, so the 645 missing bytes cannot
differ from their twins either. They were written into
`work/name-prompt.vsf` from `$129C`-`$12A1` (00 00 00 01 00 00) and
`$182C`-`$1AAA` (zeros, then 02 08 07 05 0E 04 0C at `$1AA4`), the
listing was built again, and it gained those 645 bytes with every other
byte unchanged. Each stretch has a line comment. No 6502 instruction
names either; their owners stay open.

## Platinum: the port, its pacing and the maintainer's check (5 and 6 November 2026)

A maintainer's run, from Bronze at 94.6 % to a Play tab that is the
whole game. The contributor's capture began at the name prompt, so the
run took the male edition's six disk sides from the C64 Preservation
Project and played them to Infancy and Childhood. All seven phases are
one load, the life object, read over the start object at `$8466`: the
game became three parts, `main`, `start` and `life`, each listed from a
snapshot of its own.

The p-code was decoded first (`port/scripts/vm.py`, 90 procedures, 62
resident, 5 in the start and 23 in the life object) and printed as
statements (`decompile.py`), then ported routine by routine to
JavaScript beside a model of the KERNAL and the drive (`port/src/`).
The KERNAL's interrupt and keyboard were matched to the real ROM over
18,000 interrupts, and the game's own code then ran from the hand-over
at `$4000` on the kit's C64 with that drive. The lockstep
(`port/test/lockstep.js`) compares the port with the game's memory and
chips at every call of GETIN. Coverage reached 100 % on the way: the
life object's first 5,420 bytes, which the old listing never reached,
were annotated, and its wrong claims about the scene buffer, the
RUN/STOP menu and the border colours corrected.

Two things in the lockstep needed care. The kit's C64 reads the SID's
noise as 0, so every session hands the game and the port the same dice
from a seed (`.dice`; 0 keeps the zeros). And one session lost a
RUN/STOP that GETIN read straight after an interrupt left through the
KERNAL's exit: the kit's lockstep gave the read to the interrupt, and
now checks the stack at reads and stops as well
(`kit/lessons/2026-11-06-alter-ego.md`).

The page's pacing took the longest. A least-squares fit of each
routine's cost from the lockstep's timing ran Infancy four times too
slow: routines always called together shared their cycles in any
proportion. So `port/scripts/profile.js` measures them instead, giving
each instruction's cycles to the routine whose code it is, and splits a
routine round a wait for a key into a call, a turn of its loop and the
wait. Two mistakes in that profile cost hours. Fills, copies and loads
cost by the byte, not by the call, so they are charged by their size
argument. And the gateway every 6502 routine is entered through
(`$7059`-`$70F7`) was charged to whatever label the instruction pointer
last passed, which during the scene text's decoding was a scratch
address: about 1.5 million cycles of Infancy were missing. They are now
the gateway's own, `enterNative`, counted per call.

Two more were found when one Infancy page still settled 88 frames early.
The interpreter moves its instruction pointer past each byte it reads,
so a procedure's last instruction, its return, was charged to the
procedure stored after it: the map's renderer, behind the key reader,
took 4.8 million cycles in a session that never draws the map. The
profile now places the interpreter's time by the byte before the
pointer. And 1.8 % of the game's time is spent under labels the port
never calls, so the page never paid for it: the points a 6502 routine
resumes at after a procedure it called (one of them 69,059 times over
the sessions, once for each LZW code read), and tails several routines
jump into. Their
cycles now go to the routine the port does call that the processor
entered last, and each routine is charged by the port's count of its
calls.

Old Age was played to its end on the game's own code: the life's last
scene, the menu, then a new life in Infancy with the twelve traits and
the name kept. The `old-age` session records it in lockstep. Checking
the save code against the LIFE TIME screen found a bug: the fraction of
a year at `$7FC4` is not saved, so a resumed life loses its months
(Discoveries).

The maintainer's check followed `kit/CHECKING.md`, on claude-fable-5-1
for every checker. A sample of 90 comments in three strata (seed 61106)
found 18 wrong, far over the mark, so every one of the 1,312 comments
was audited, in six ranges, one checker after another, and 215 were
corrected. The wrong ones were rarely wrong about what a routine is for:
comparisons named the wrong way round, a callback pointer that is two
bytes of the drive's record buffer, a routine named for the traits that
shows a three-line message, and figures from the name prompt's snapshot
carried into the life object's listing, whose snapshot holds another
scene. Each part's listing was built again from its own snapshot after
the audit.
