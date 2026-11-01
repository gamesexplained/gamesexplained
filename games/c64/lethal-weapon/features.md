# Lethal Weapon — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Wikipedia, "Lethal Weapon (video game)", https://en.wikipedia.org/wiki/Lethal_Weapon_(video_game), read 1 November 2026
- Video Game Music Preservation Foundation, "Lethal Weapon (C64)", https://www.vgmpf.com/Wiki/index.php?title=Lethal_Weapon_%28C64%29, read 1 November 2026
- Web search summaries of Lemon64 and GameBase64 (pages not reachable from this session: second-hand), 1 November 2026: music Mark Cooksey; a forum post relays the booklet as crediting Michael Delves (programming), Don McDermott and Adrian Page (graphics)
- C64-Wiki had no page for the game (404) on 1 November 2026.

## Features

| Feature | Status | Where |
|---|---|---|
| Choose Riggs or Murtaugh at the start | live | `$C34C`, `$FFF1` |
| Linear stages, no choice of mission | confirmed | exits in each overlay, `$22CB`, `$2388` |
| Side-scrolling platform play | live | eight-way scroll, `$14E1` |
| Guns | live | `$1DB3`, `$1EB1`, `$1F37` |
| Grenades | open | no grenade throw found for the player; searched the joystick actions (`$2813`, `$2502`) and the fire code |
| Punching | open | not found in the player's controls; searched the same |
| Riggs fires faster, Murtaugh jumps higher (other versions) | differs | both fire the same way; same jump height, Riggs slower (`$36A0`, `$36E2`) |
| Music by Mark Cooksey: Game Theme and Game Over | confirmed | MUSI, three tunes (`$E8C1`); which is "Game Over" is open |
| Time limit | live | `$F424` |
| Energy, lives, continues | confirmed | `$F373`, `$373C`, `$2865` |

## Beyond the documentation

- A magazine every five seconds of the clock (`$F47A`).
- P pauses (`$E12F`).
- The game-over load of TITLE, absent on this disk (`$0766`).
- An unused stage, L4AX.

## Open questions

- Which of the three tunes the VGMPF calls "Game Over"; nothing in the
  game part plays music, and the title plays tunes 0 and 2.
- Whether the original disk has a file TITLE.
