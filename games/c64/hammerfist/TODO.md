# Hammerfist — TODO

## Human curation for Gold

Read and curate every authored section, then record copy provenance and stewardship. The unattended copy remains `agent-draft`.

## Listing

A maintainer's check on 18 November 2026 audited every comment, and a new sample of 95 after it found none wrong. Three things the audit could not settle without a snapshot of each load:

- Some blocks are left undefined in `symbols.json`, so the Source tab shows them as gaps, although code reads them or their notes describe them as routines: Complex 7 `$8538`-`$855B` and `$8CC7`-`$8CD0` (the turnaround pose tables); docking area `$8BA8`-`$8BC1`, `$9D00`-`$9D04` (pickup collision shape), `$9FC3`-`$9FC6` (the bytes the defeat path writes to CIA 1), `$A4B8`-`$A4C5` (code) and `$BC98`-`$BCDD`; third load `$7987`, `$7B45`-`$7B5D`, `$9DD7`-`$9DF8`, `$A1D1`-`$A1D5`, `$A494`-`$A497` and `$C1BB`-`$C200`; fourth load `$A57A`-`$A57E`, `$A83D`-`$A840` and `$C512`-`$C557`. Typing them needs the snapshot to rebuild the listing.
- Fourteen speed-initializer entries have no caller in their own load (Complex 7 `$94EA`, `$94F1`, `$94FD`, `$9509`, `$9515`, `$9527`, `$9530`; docking area `$8BE3`, `$8BEC`; third load `$9174`; fourth load `$94F4`, `$950C`, `$9518`, `$952A`), and the third load's room-ending wave can never start: its spawner at `$849F` leaves while the counter `$13DC` is zero, and only its own increment could change that. Both are leads for Discoveries, as code the game keeps and never runs.
- The facts files say the music bytes `$EEAE`-`$FB9B` are the same in every load. The docking area's and the third load's listings hold no bytes there, so the claim needs the snapshots to check.

## Open documented behavior

The manual's three-fire inward-turn gesture and down/two-fire weapon gesture have traced input readers but no recorded legal-input checks. Every actor shape is rendered, but the manual's species names are not reliably matched to all actor records. These are explicit open features, not claims of missing code.

## Possible follow-ups

- Match the rendered opponents to the manual's names with a player's help.
- Record a short legal-input route demonstrating each multi-fire gesture.
- Add collision and security-progress overlays to the room browser.
- Curate the article around the findings a player finds most useful.
- Play YCY into the high-score table and press F3 in a live game, to show the room skip working from the keyboard.
- Confirm with the image that the loader requests only tune 4, and that no code on side A requests tunes 2, 3 or 5.
- Listen for the sound-register store at resident `$FE1C`: if the retriggered effect sounds wrong in play, it earns a `Bug:` section on Discoveries.
- Rename the routine at `$158A` and its variables after the names in the retained source (`MULTISETUP`, `S.SWAPNOW`, `S.XPOS`, `CS.XPOS`); the rename needs the snapshot to rebuild the listing.
