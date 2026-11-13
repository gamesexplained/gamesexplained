# Turrican 2 — agent history

## 13 November 2026 — orientation and resident engine

The run uses gpt-6.1-sol and kit 0.0.339, targets Silver, and permits
game downloads and opening the PR/issues. The contributor requires
targeted instruction traces or watchpoints for unclear behavior and
excludes optional playthroughs, replays and extra integration proofs.
After startup they required headless operation and dummy audio.

The installed GUI VICE was stopped. The official v3.14.0 macOS ARM64
headless ZIP was downloaded under tools. It needed a FLAC library at an
absent Homebrew path. The already installed GUI release supplied the
libraries; a wrapper inside tools sets DYLD_LIBRARY_PATH after the
launcher has entered its pseudo-terminal and executes the headless
binary with dummy sound. Passing that variable only to tools.py did not
survive the system pseudo-terminal wrapper. No system library or
Homebrew package was installed. The launcher mistakes the manual
release's symlink for an own build and infers this repository's git
revision; that inferred revision must not enter the game's tool record.

Contrary to the kit's older headless warning, this release passed exact
stops, instruction stepping, stopping watchpoints and frame stepping.
Its check reported 56 passes and two failures: host key input, and a
checkpoint-list exception in the final quirk probe. Matrix keys passed.
One later run/poll sequence crashed the emulator after arming the Space
reader; restarting preserved the disassembler and saved snapshots.
Waiting briefly after resuming avoided that race in the successful
targeted trace. The cause of the crash is unknown.

The C64Games archive contains several releases. The Triangle disk pair
was chosen because its accompanying description says it has no trainer
and uses the original fast loader. Boot showed the story intro, title
and first level. The original preservation site's disk downloads
required authentication. The images remain in work.

The level-transition dispatcher was followed for 25 CPU instructions
from $0A49 into $544A. That supplied a loader route to the eleven levels
and ending without playing through them. Side two is requested before
world three. An initially broad stop at $7A01 also fired inside a
level-2-1 initialization routine; it is an ending entry only in the
ending load. The level-2-1 snapshot was continued to $555D and replaced.
The work capture log retains the earlier register row, so use the
snapshot and orientation's corrected route rather than that row.

Comparing level snapshots separated a resident engine below $6C00
from overlays. The level-1-1 symbol map was split into resident and
overlay ownership; the lives label at $FFFC was moved into the resident
map when the upper runtime area was taken out of overlay ownership.

The loading strings defeated both ordinary text sweeps and a
constant-offset word search. Rendering their multicolour components
showed four components per letter. The font at $5DC8 and cell tables at
$6000 were reconstructed into readable loading/disk-change/ending
messages. A separate panel font is stored in otherwise unused screen
RAM, and was added back to coverage's default screen exclusion.

The scrolling code contains 24 repetitive screen/colour copy routines.
A decoder checks every adjacent absolute-indexed load/store pair and
the loop limits before generating their factual copy descriptions.
Some old automatic symbols were false targets from the split pointer
tables. Each removed target was checked against all decoded table
entries. Clearing an untouched automatic name did not remove it in
regenerator2000 0.9.18; renaming it and then clearing it did. Export was
forced for the intentional loss of those false aliases, with no
annotation loss. The loaded-data audit still has to cover all authored
data before the final figure is trusted.

Space was traced through the actual power-line activation instructions.
The successful clean-state trace has 71 instructions and changes
ammunition from three to two while writing $D3 to $017E. The first
attempt after an emulator restart allowed an earlier activation before
the intended stop; explicitly pausing before snapshot load made the
trace start at the saved state. This is why a running load is not a
valid fixed starting state.

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## Resident data and packed-image boundaries

The resident ledger reached 100% after seeding the independent IRQ,
main-stage and hook entries, typing the unrolled copy continuations,
and describing the sound and beam command data. The first sixteen-entry
actor-table reading was incomplete: the tables overlap at `$08BE` and
have seventeen entries. A six-instruction live trace proved type sixteen
reaches `$5B27`; symbols and facts were corrected in place.

The adjacent pointer-table problem was caused by lost native splitters,
not by the labels themselves. Clearing regenerated aliases alone was
insufficient. The project writer now preserves adjacent declared table
boundaries, and its reader restores them from the native splitter list.
The regression test covers the native merger's one-block representation
and the three logical tables. Rebuilding and then triggering live
analysis retained the correct tables without false pointer targets.

An initial description of `$0937` as sprite colours was corrected after
seeding the previously untraced `$0CF4` handler exposed its real reader:
it is an eight-entry raster alignment delay table. Several self-modified
operand aliases were likewise described at the instruction they belong
to rather than invented as subroutines.

The first snapshots named entry were taken after level initialization.
To establish actual load extents, the original unpacker was executed on
the kit CPU with file bytes supplied at its reader. A live loader stop at
`$6B29` and a snapshot before initialization independently established
file `11` output; all 23552 output bytes matched. Files `23` and `61`
begin as unpacked level-1-2 images rather than compressed sections; their
selection and remaining bytes still require attribution.

## Continued level analysis

Level 1-2 reached 100% measured coverage over its exact packed-load extents, with a stopping read watchpoint proving the boss pose arrays share map storage. Corrected the separate ground-walker fall and flattened-motion allocations to thirteen and twenty-seven bytes in both first-world listings. Level 2-1 reached 100% over 29362 tracked bytes, including its patched swimming entry. An instruction trace proved its split boss action directory lives inside nominal map rows. Kept the unresolved table at $9C80 explicitly open.

Level 2-2 reached complete coverage over its physical load extents. Its map holds executable glyph helpers as well as data; all helper targets from the phase directory were seeded explicitly after typing the map. Traced original instructions for the embedded initialization glyphs and boss action dispatch. Distinguished the boss X matrices and animation sources from ordinary sprite slots.

Level 3-1 reached complete coverage over 34706 tracked bytes, including its music driver, dedicated flight weapons and player callback. A stopping map read watchpoint resolved the misleading retained height/count fields. The spawn streams occupy reserved glyph positions in four character banks. Traced the music instruction readers on the kit CPU to separate instrument, modulation and pattern allocations. No optional playthrough or combined-mechanics proof was added.
