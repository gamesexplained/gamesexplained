# Castle Master — orientation

## Disk and boot recipe

The supplied RAM dump was captured at the language menu. The matching Dualis D 64 was recovered from the contributor’s repository history and kept privately as `work/castle-master-dualis.d 64`. Its first directory entry is `CASTLEMASTER/[D]`, 179 blocks. No game binaries or snapshots are published.

With VICE MCP 3.13.1 (PAL):

1. Hard-reset the machine, resume execution, and autostart the D 64’s first entry. Wait for the animated Dualis intro. Fire on port 2 did not dismiss it in this run.
2. Hold Space for 60 frames, release it, and advance 1,200 frames. The game unpacks and draws the language menu. Wait until the language choices are visible. Save `work/disk-menu.vsf` without ROMs using `pause()` from `kit/c64/vice.py` before saving.
3. Hold `1` for 60 frames, release for 30; hold Return for 60, release for 30. Repeat `1`, Return for the character menu with the same holds and gaps.
4. Advance 300 more frames. Confirm the castle exterior and WILDERNESS label, then save `work/disk-play.vsf` without ROMs.

The emulator check on 30 September 2026 passed 55/57 checks. Failures: `pause-at-instruction` and `unpaced-calls`. This run uses `pause()` (which finishes the instruction by advancing a frame) and paced calls. The game was booted from disk for this recipe; no restored private snapshot is needed.

## Comparison and listing image

The menu reached from disk matches all 27,968 code bytes and all 778 word-typed bytes in the original analysis. Of 36,790 byte-typed bytes, 57 differ, at processor-port backing RAM, stack/keyboard state, engine state and SID player state. The original text export seeds labels and comments; the Source bytes come from the newly booted snapshot.

Comparing menu with settled play, `$87CC–$95DB` changes in 3,552 bytes as menu storage becomes the linear viewport; `$E000–$FF3F` changes in 3,218 bytes as the bitmap is drawn. The world database `$9D00–$BF8F` and interpreter tables `$13AE–$13ED` agree byte for byte. There are 65 differing code-typed bytes across nine blocks. All are operand bytes and all have traced direct producer instructions; the private producer report identifies them. A cold hand-over capture at $476F is available as `work/entry.vsf`; Space must be held after the Dualis intro has reached its steady waiting loop. The menu retains the authored menu occupant that rendering replaces, so the listing uses `disk-menu.vsf`; verification uses the running game and `disk-play.vsf`. Generated viewport pixels and palette cells stay out of the denominator; the loaded surrounding HUD and its initial colour planes are authored data and remain in it.

## Machine state and rebuilding

The menu snapshot has processor port `$35`, DDR `$2F`. RAM vectors: `$0314=$737F`, `$0318=$7579`, `$FFFA=$7579`, `$FFFC=$476F`, `$FFFE=$FF48`; these agree with play. VIC bank `$C000`, screen `$C400`, bitmap `$E000`.

Import the committed symbol map onto your own menu snapshot with `symbols_import.py`, start regenerator 2000 on the resulting project, then export with `symbols_export.py`. Build with `python 3 kit/scripts/listing.py games/c64/castle-master games/c64/castle-master/work/disk-menu.vsf --entry games/c64/castle-master/work/entry.vsf`. Compare with the play snapshot separately; `--entry` supplies the live capture at the loader’s hand-over.

Original export SHA-256: `79505396ccd9542c55e67fb381b42210284ceba0dc51aa3d7dd1d39df277753d`. Its maker’s model is unknown.
