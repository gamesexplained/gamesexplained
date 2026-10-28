# Green Beret — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 28 October 2026: the Silver run

One agent, from about 03:00 to 07:00 UTC, on a Linux cloud container.

**The image.** The Ocean disk from archive.org's C64 Preservation Project
(`green_beret[ocean_1986](!).zip`, a G64). The boot file loads a custom
loader that reads 409 sectors no directory entry owns, shows the loading
picture with a tune and waits for a key; then it packs the I/O away,
copies itself up, and a backward depacker fills memory from `$FFFF` down
before jumping to `$4000`. Two snapshots matter: `work/depacked.vsf` at
`$4000`, which still holds the start-up code that becomes the playfield's
screen, and `work/entry.vsf` at `$36A8`, the hand-over the listing is
built from. VICE 3.13.2 passed all 57 of `check-emulator`'s checks.

**Reading the play.** A small bot played through all four stages, their
fights, the rescue and into the second round, and its recording gave the
code map. The interrupt runs in three phases (the sprite multiplexer's
bands, the status band, the playfield) and calls each through a `JSR`
whose operand it rewrites from a table, so the flow tracer needed those
three seeded by hand. The 21 virtual sprites, the five spawn lanes and
the scripted spawn table came out of the first pass; the block swaps that
change the graphics between stages took longer, because the swapped
blocks sit under the I/O area at `$D000` and the game reads them with the
I/O switched out.

**The copy-protection check.** The start-up copies twelve bytes to
`$0100` that read CIA 2 with `LAX`, `ASR` and `SAX`, undocumented
opcodes. The disassembler shows them as data. `tool-regen2000` said to
type such a spot `byte` and write the instructions in a comment, but
`check_listing.py` failed the bytes the code map saw run that were not
typed code. `kit/cpu/m6502.py` already decoded one undocumented `LAX`; the
three forms here were added to its table, with a test, and the bytes stay
code.

**The music.** Martin Galway's driver at `$E000` is three copies of one
note reader and one effects routine, one per voice, with the tunes'
patterns after them: nearly 8 KB. A decoder written for the run walked
every tune's patterns and wrote 118 of the listing's comments; the rest
were written by hand. A search of every comment that said "nothing reads"
against the addresses the decoder had walked found one wrong: 53 of the
77 bytes at `$3FA3` are the title tune's sounds, read only through
pointers in the patterns, which no instruction's operand names.

**Verify.** A fresh agent checked 80 comments drawn at random (seed
20261028): 14 were wrong. The worst was a pair of swapped labels: the
routines that start the jet's sound and a weapon pickup's had each
other's names, and the effects player's buttons with them. Each wrong
comment was traced to the belief behind it, and 14 more comments that
shared those beliefs were corrected with them.

**Building the pages** found more wrong claims than the sample did, each
corrected in the listing and `facts.md` as it was found: the helicopters
throw grenades, they do not drop bombs; the dogs come three from the
left first; the type called a rifleman was the bazooka man; the stack
can reach the tables at 12 deaths in the fights, but the game crashes at
23. The last was a reading of the code that a live test overturned: with
the stack pointer lowered by two bytes for each death simulated, the game
played on for 3,000 frames up to 22 and crashed at 23 and above.

**Martin Galway's source.** In April 2026 he published `greenberet.asm`
(github.com/MartinGalway/C64_music). Its data section, assembled by a
small script for the Ocean syntax and searched for in the game block by
block, matched the eleven sound effects and most instrument blocks byte
for byte, and showed a fourteenth tune, the hi-score table's, that the
game left out. The page's player plays it, assembled for the game's
layout, on the game's own driver.

**Coverage** reached 100 % of 63,575 bytes, with the zero page, the
variables and the playfield's screen excluded as run-time state.
