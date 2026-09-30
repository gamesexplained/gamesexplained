# Doctor Who And The Mines Of Terror — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The contributor allowed looking the game up online. On 30 September
  2026 this session's network refused every game site it tried (C64-Wiki
  over HTTP and HTTPS, Lemon64, GameBase64, MobyGames, Wikipedia, Games
  That Weren't, archive.org, bbcmicro.co.uk, the TARDIS wiki). What is
  below comes from web search result summaries of those pages, read the
  same day, and is weaker than reading the pages: treat each row as a
  lead, not a statement.
- Search summaries of Wikipedia, "Doctor Who and the Mines of Terror",
  and of the Games That Weren't entry (2022): released by Micro Power on
  the BBC Micro in 1985 and on the Amstrad CPC and C64 in 1986; a ZX
  Spectrum version was developed and not released; the C64 version was
  long thought unreleased until an original copy was found.
- Search summaries of the Wikipedia and GiantBomb pages: the Sixth Doctor
  and Splinx, a programmable robot cat; the Master is mining heatonite to
  build a TIRU; the Doctor recovers the plans and escapes. The Doctor can
  jump, climb ladders, press buttons, and throw or use items, and carries
  four items in his pockets. Deaths: monster attack, robot attack, too
  great a fall, forced regeneration, lack of oxygen, spikes.
- Search summaries of stardot.org.uk forum threads (BBC Micro version):
  the Master tries to take the TIRU crystal at the end, and getting it
  past him with Splinx's help earns a 4096 escape bonus; oxygen lets the
  Doctor go outside; cloth disables controllers that run over it.
- Key lists found by search (Z, X, `:`, `/`, RETURN, U, P, I, C, E, H, F0)
  are for the BBC Micro version and do not match the C64's reader at
  `$8F3C`; the C64 keys below are read from that code.
- The game's own screens: the Splinx Programmer screen (`reference/splinx-programmer.png`).

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in control port 2: left, right, up, down, fire | confirmed (left, right and fire live) | reader `$8F3C` |
| Keys Z left, X right, `;` up, `/` down, RETURN jump (C64) | traced | reader `$8F81`-`$9013` |
| F1, F3, F5, F7 each set their own flag | traced; F3 drops a marker ("MARKER 4" on the status line), F1 moves the pocket highlight | `$9015` |
| S opens the Splinx Programmer | live | `$9029` |
| D, CTRL+D, R, L set a mode byte `$E8` | traced | `$8FA4`, `$902F` |
| A scrolling cavern map, one screen wide window | live | |
| Ladders to climb | live | |
| Four pockets for items (status bar boxes) | open | |
| Score, six digits | live (000000 at start) | |
| Six figures beside the score (lives or regenerations) | open | |
| Splinx follows the Doctor | live (seen beside him after walking) | |
| Splinx programmer: change mode, go to markers 1-4, return to Doctor, wait, pick up, drop, recharge; shut down, follow Doctor, execute program; battery gauge | live (screen shown) | |
| Splinx battery drains and is recharged | open | |
| Markers 1-4 placed in the mines for Splinx | open | |
| Pick up, use, throw and drop items | open | |
| Push buttons | open | |
| Robots and monsters that kill | open | |
| Death by falling too far | open | |
| Oxygen needed outside | open | |
| Spikes | open | |
| Forced regeneration | open | |
| Heatonite mining, TIRU, recovering the plans | open | |
| The Master takes the TIRU crystal at the end; escape bonus 4096 | open | |
| Load saved games from disk (BBC key list) | open | |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions
