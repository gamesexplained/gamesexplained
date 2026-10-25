# Toki — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Skip to the next stage | Hold joystick 2 up and fire and joystick 1 down and fire for at least one frame (sets `cheat_flag` $08F9), then press the Commodore key. Pokes: `cheat_flag` $08F9 non-zero, then the Commodore key | Read from the code (`update_player` $8588, `read_keys` $5308, the main loop after `wait_frame` $81A5), tested live in VICE on 25 October 2026 from stage 1 (flag rose each frame, the Commodore key then moved to stage 2; the Commodore key alone did nothing). Later stages not tried. Works while `stage` ($08E7) is below 4 |
