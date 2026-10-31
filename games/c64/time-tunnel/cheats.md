# Time Tunnel — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Pause or unpause, as F7 does | `$AF` = 0 to pause, `$FF` to run (`keys_read`, `$38FF`) | live: F7 toggled it in the emulator, and the main loop skips everything while it is 0 |
| Start in another era's first room | `$2A` = the era (1-9), `$19` = the room, then `era_enter` (`$38A4`) | live: how the room screenshots in `reference/` were taken |
