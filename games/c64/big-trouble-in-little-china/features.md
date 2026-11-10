# Big Trouble In Little China — features

What the game is documented to do, with its status against the image.
Statuses: **open** (documented, not found yet), **traced** (in the code,
could not be exercised), **confirmed** (in the code, consistent with the
emulator), **live** (observed directly), **differs** (the code does
something else). Only the first minutes of play were exercised.

Sources:

- Wikipedia, "Big Trouble in Little China (video game)", read 10 November 2026: designer Mev Dinc, publisher Electric Dreams Software; Amstrad CPC, Commodore 64 and ZX Spectrum. Its lead says 1986 for all three and its infobox says 1987 for the Commodore 64.
- Commodore User, issue 44 (reviewer Bill Scolding), text on everygamegoing.com, read 10 November 2026.

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen with the logo and three heroes' portraits, started with fire | live | `$11E0`, fire on joystick port 1 |
| Three playable heroes (Jack Burton, Wang Chi, Egg Shen) shown as three framed portraits with energy pips, the active one highlighted | live (portraits and pips seen); who is who is from the reviews | screen |
| Switching between the heroes at will, the other two following | open: no key or stick move that switches was found | |
| Street level that scrolls as the group walks left | live | screenshots in `reference/` |
| Enemies (blue ninja-like fighters) that run and jump in from the left | live | |
| Energy shown as purple pips under each portrait, and a score of eight digits | live (shown); what changes them is open | |
| Jack's gun with limited ammunition, Wang's swords that break, Egg's magic bolts | open (Wikipedia; the reviews say the heroes start unarmed) | |
| A second level in the sewers with dragons that cannot be killed and must be jumped | open (Commodore User) | |
| Pausing with the Pause key to start play, as the review says | open | |
| Sound effects through the SID | confirmed | `$2AA6` |
| Music | open: no music driver was seen in the code that ran | |
| Two video banks flipped every frame, with a raster-interrupt sprite multiplexer | confirmed | `$0622`, `$0763`, `$0A68` |

## Beyond the documentation

- The disk image is a freezer-style crack, so the game's own loader and any copy protection are not in it (`orientation.md`).

## Open questions

- Which stick move or key changes the active hero; where the levels' data is; how enemies are chosen; whether the game has a second level that the player can reach, and how.
- The year: 1986 or 1987 for the C64 version (the two Wikipedia statements disagree).
