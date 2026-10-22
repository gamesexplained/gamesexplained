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
