# Publication history

30 September 2026: contributor authorized publication directly from the existing exhaustive disassembly, online research, and a separate PR for each game. Imported annotations without claiming a new reverse-engineering run. Measured the repository’s own prose coverage and retained Bronze pending completion and maintainer review.

30 September 2026: replaced the non-running composition with a booted Central Park snapshot. Traced overwritten startup to double-buffered sprite output. Kept the article Bronze pending coverage/verification; later loads remain open under RFC #124.

### Packed resources and indexed aliases

Validated 162 main and 80 auxiliary sprite records independently against the fresh capture; all expansion lengths and boundaries agree. Checked all 118 scene record boundaries and child indices. Added record-specific annotations and restored the sprite browser after comparing its arrays with fresh RAM. Corrected the decoder description: `$68` escapes a literal, while `$69-$6F` encode zero runs. Retyped `$0000-$0FFF` as data, removing false code cross-references produced by decoding runtime sprite buffers. Traced `$159D` as a negative-index base alias for masks at `$1695`, and documented frame read windows whose storage boundaries depend on actor paths. Coverage is 89.9%; this is progress toward Silver, not completed feature verification.

### Live boundary checks and complete resource ranges

Executed the native sprite decoder on ten records and checked its exact output. Player-damage tests corrected the imported claim that every damaging result writes a reaction: this routine preserves action while health remains positive. Projectile tests check both accepted and rejected boundaries. Parsed all 32 animation sequences and observed one command reaching the expected composition entry. Captured the level-loader EOF return `$10F8`; its comparison exposed pointer-table/resource tails outside capped symbol spans. Added only validated complete resource ranges; the remaining loaded ranges stay in TODO. Shared importer fix #125 prevents omitted ranges from defaulting to code.

Traced the condition, collision, interaction and sound directories. Independent collision compilation matched all 18 areas. Eleven unexplained spans between frame records proved to be animation streams, and native first commands matched every stream. Corrected the imported world-height interpretation at $B3D6 to elapsed-tick enemy-meter regeneration after sixteen native boundary cases. A first scratch decoder mishandled the compiler flags and backward chain endpoint; corrected it against the instructions and reran every area. Verified the undocumented object-display span in four paths and typed it as code. Added and browser-checked collision and meter controls. Upper-memory tail, residual annotations and full gameplay verification stay open.

### 1 October 2026 — source alignment correction

Backport review found that the Source writer split the native-checked C096 LAX into one byte and a spurious operand-derived ROL. The opcode-aware export now keeps all three bytes together; an integration fixture verifies the following RTS boundary. The native semantics checks remain the same four recorded cases.


## 1 October 2026 — annotation review correction

Qualified the enemy-meter slot comment: $B5C3 writes the hit-processing result and can clear it; it does not clear the slot on every hit. The native calculation and article remain unchanged.

## 4 October 2026 — the game in parts

The kit gained a layout for a game that loads in parts, and this game was the case that asked for it: the page showed 99.6 % for one level of seven, with the other six in a to-do line. The analysed image became the part `central-park` as it stood, with no rebuild: its listing still matches its symbol map. The six later levels were given folders that hold their names and nothing else, so the page counts them. Nothing new was analysed. The image still holds the engine and Central Park together, and telling them apart is the next step, in `TODO.md`.

## Typed data no label reached (22 October 2026)

The ledger began counting typed data that no label reaches, and the Central Park listing lacked 206 such bytes in nine stretches (#485). Comments now describe them: three runs of zero padding, an `rti` that both NMI vectors point at, three unreached instructions left between routines, a one-record scene list that `CentralParkDrawUiImageRecord` hands the renderer, and the NMI and IRQ vectors at `$FFFA` and `$FFFE`, now typed as words. A keyboard table and a raster wait at `$FFA9–$FFF9`, which no instruction in the load reads or runs, and the reset vector, which the 6510 reads only from ROM, are left out of coverage in `part.json`. The new bytes came from a capture of side A of a copy cracked by The Force with Ikari+Talent's trainer, because the contributor's disks were not to hand; it agreed with every byte the listing already held but one, and the rebuild kept the listing's own bytes. Coverage stays 99.6 %.

## 24 October 2026 — every part, to Silver

The run that took the game from one level to all sixteen parts, on
claude-opus-5-5[1m].

**The images.** The contributor's disks were still not to hand, so the
whole game came from The Force's crack with Ikari+Talent's trainer, both
sides, from archive.org (`orientation.md`). X-Rated's crack was fetched
to compare bytes; it lacks the trainer's three patched instructions,
which is how they were recognised as the crackers'.

**Telling the engine from Central Park.** The imported map held both in
one image. Booting twice with RAM filled with `$00` and then `$FF`
(`work/fill_boot.py`) showed which bytes the engine's load writes, and
watching the level loader's segment headers (`work/watchload.py`) gave
each level file's two ranges. `work/split.py` cut the map three ways:
the engine, Central Park's title load and its play load.

**Six more levels.** Each later level is Central Park's code reassembled
at other addresses with its own data. Walking instruction streams from
unique anchors (`work/align.py`, `work/reloc.py`) paired almost every
routine, and Central Park's comments were carried to the same routine in
each level (`work/xfer/gen.py`), with operands rewritten. What differed
(The Office's helicopter, The Basement's code copy, the Final Battle's
lock) was written by hand. A fix to Central Park therefore reaches every
level only after the levels are generated again, which is why the audit
applies fixes in two stages.

**The intro** is unpacked from `NINJA INTRO /I+T` and stops on `$0800`.
Its hidden credits are in `ScanKeys` and the scroller; holding L on the
logo in the emulator confirmed them.

**Coverage** reached 100 % in all sixteen parts. The levels' generated
templates (frames, scenes, packed sprites, walls) were the bulk of the
comments.

**Accuracy.** The run's own sample of 80 found 19 wrong; each was
corrected along with every comment that said the same, 1,109 in all.
The maintainer's sample, on the contributor's say-so and with a new
seed, found 10 of 60 wrong, over the mark, so every comment was audited
by fresh checkers one unit at a time.

**The audit.** Seventeen units, 1,942 items (a template's comments
counted once, checked through a few of its instances), covered every
comment but the 1,428 carried over to the later levels unchanged, which
stand with the Central Park comment they copy. Checkers found 382 items
wrong in a detail. Two findings reached beyond their units. The first:
the end of the engine's interrupt, `$1F52-$1F6B`, is the crack's
trainer, not the game's; X-Rated's crack of the same disk goes from the
clock straight to restoring `$01`. The second: a carried comment can be
wrong on code of the same shape, when the level calls its own routine in
place of Central Park's or loads another constant. Comparing every
paired call's target and every paired immediate with Central Park's,
by script, found about sixty such
comments, which were rewritten for each level (`work/xfer/rules.py` and
`own()` in `gen.py`), and a last unit checked the rewrites. The facts
files were audited claim by claim: 66 of 355 were wrong in a detail.

**The second sample**, seed 25956, found 1 of 60 wrong: the condition
lists' template called the largest depth at which a picture is tested
the smallest. The audit had found that, and the correction had gone
only to the instances the checker was shown. Searching every member of
every family a checker marked wrong, for the words its correction
replaced, found 66 condition lists and eight comments in The Mansion
and The Final Battle still wrong, and a search for each correction's
replaced phrase across all comments found four wall counts in The
Office. All were corrected: 2,257 comments differ from the listing the
maintainer's first sample was drawn from.

**Pages, and two mistakes the pages caught.** The title card first
came out with the panel's lettering broken: the card's routine writes
colour RAM only for the window, and the panel's colours come from the
copy of colour RAM the engine keeps at `$0800`. The page's test had
fingerprinted only the window's bitmap and screen colours, so it passed;
a screenshot showed the fault, and the test now compares painted pixels,
the whole screen for Central Park. The level-skip port first counted
changed readings; the game counts readings the next scan finds
unchanged, and the test, held on 20,000 readings against `$95AB`, said
so. The hidden credits were first said to run for 3,210 frames, which
was how long the live test watched them, not the length of the text:
1,058 characters take 4,232 frames.
