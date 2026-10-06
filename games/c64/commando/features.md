# Commando — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- [Commando — C64-Wiki](https://www.c64-wiki.com/wiki/Commando), read 2026-10-06. Release/version details, controls, and game description.
- [Commando — Lemon64 instructions](https://www.lemon64.com/doc/commando/148), read 2026-10-06. Original loading instructions, objectives, controls, pickups, and obstacles.
- [Commando — Lemon64 review](https://www.lemon64.com/review/commando/30), read 2026-10-06. Areas, scrolling, enemies, and fortress waves.

## Features

| Feature | Status | Where |
|---|---|---|
| Move Super Joe through a vertically scrolling battlefield | live | Port-2 up scrolls terrain while the player stays near the same screen coordinates; port-2 left moved the player left in a short run. The full eight-direction input map is not verified. |
| Start the game with joystick fire | live | Port-2 fire starts play from the title screen. Firing the M60 in play is not yet verified. |
| Throw grenades with Space | live | Space reduced the HUD count from 5 to 4 and a grenade projectile appeared; code still to trace. |
| Play the score during gameplay | confirmed | SID state showed changing frequencies on all three active voices during play; `$5012` and `$50AA` are the sequence tick and per-channel updater. Listening and mapping the score sequence remain open. |
| Save high-score data to disk | confirmed | `$44E0` calls KERNAL SAVE for `@S:COMMANDO HI /REM`, saving `$0EED-$0F47` (91 data bytes). The payload matches the supplied 93-byte PRG including its two-byte load address; the save path has not been exercised live. |
| Collect grenade boxes to replenish the grenade count | open | C64-Wiki documents flashing boxes; collection not yet reached. |
| Fight through three areas and their fortress waves | open | C64-Wiki and Lemon64; later areas not reached. |
| Enemies include soldiers, bazooka users, vehicles, and units in cover | open | C64-Wiki and Lemon64; code and live behavior not yet checked. |
| Trainer release offers up to five selectable options | live | The supplied REMEMBER crack's title menu identifies `Commando 100% +5`; no trainer option selected. |

## Beyond the documentation

Nothing established yet.

## Open questions

- Which routines unpack the REMEMBER release, initialize the engine, and install the IRQ handler?
- Does this disk image implement all three areas in resident memory, or reload any game data?
- Which trainer options are enabled by default, if any?
