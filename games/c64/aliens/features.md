# Aliens — features

Statuses: **open** (documented, not found in the code yet), **traced**, **confirmed**, **live** (observed in the emulator), **differs**.

Sources:

- *Aliens: Exterminator's Sourcebook*, Activision's manual for the C64 and C128, https://www.mocagh.org/activision/aliens-manual.pdf, read 10 November 2026
- Wikipedia, "Aliens: The Computer Game (US Version)", https://en.wikipedia.org/wiki/Aliens:_The_Computer_Game_(US_Version), read 10 November 2026
- the game's own screens, run in the emulator on 10 November 2026

## Features

| Feature | Status | Where |
|---|---|---|
| Six levels in a fixed order: drop-ship, APC rescue, operations room, air duct maze, Newt rescue, Queen fight | confirmed | `stage_files` (`$3B53`) and `main_new_game` (`$086E`) in the engine; each reached live through its status code; `reference/` |
| Each level is introduced by text briefings and speech-balloon scenes advanced with RETURN | confirmed | story text `$13BE`-`$2210` in the engine; the briefing scene `scene_balloons` (`$88C5`, stage 1) |
| Mission status codes, one per level, entered at "Colonial Marines status update" | confirmed | `make_code` (`$1720`) and `apply_code` with `code_keys` (`$1730`); codes 2727H and 1506E accepted live |
| Equipment identification (glove cursor, joystick fire) before level 1 | confirmed | `equip_loop` (`$8FD4`), `equip_boxes` (`$90AD`); a wrong piece tested live |
| Level 1: the drop-ship follows a pipe, with a profile compliance indicator | traced | `script_tick` (`$847C`), `deviation_check` (`$8363`) |
| Level 2: four marines on monitors, F1 F3 F5 F7 switch, a motion tracker | traced | `marine_switch` (`$899F`), `marines_timers` (`$8A16`), `aliens_tick` (`$8BBC`) |
| Level 3: a marine with a flame thrower holds off aliens dropping from the ceiling | traced | `lane_hit` (`$8721`), `drop_start` (`$858E`), `fuse_tick` (`$83F8`) |
| Level 4: overhead maze, one third on screen at a time, hand grenades cost a marine | traced | `maze_map` (`$9430`), `squad_move` (`$8144`), `marine_lose` (`$8EB8`) |
| Level 5: 17-minute clock, 99 rounds, flares dropped with the space bar, range locator | traced | `objects_init` (`$8344`), `flare_drop` (`$917E`), `locator` (`$93A1`) |
| Level 6: Ripley in the power-loader against the Queen; grab her when she is tired and drop her through the airlock | traced | `strike` (`$8851`), `queen_recover` (`$889A`), `grip_tick` (`$846E`) |
| Music and sound effects by Russell Lieblich | confirmed | `music_tick` (`$249E`), `effects_frame` (`$2B0F`); played by the game's own code in `test_music.js` |
| RUN/STOP + RESTORE replays a level; RETURN advances | traced | `nmi_restart` (`$0959`), armed by `frame_tick` (`$099D`) while RUN/STOP is held |
| A level can be skipped with a key and RESTORE, and a game with a skipped level does not show the final screen | traced | the key is up-arrow: `stage_abort` (`$08AC`) sets `$0202`; the ending (`$88DA`, Queen part) checks it |
| Joystick in port 1 | differs | `read_joysticks` (`$0BFE`) reads both ports, so either works |

## Beyond the documentation

- The disk is a crack. Its trainer lists a menu of cheats across the levels (for example "unlimited time" and "wanna have 255 flares") and the six level codes; `trainer_patch` (`$2C06`) applies them. Its Commodore-key skip clears `$0202`, so it keeps the ending.
- `sfx_rumble` (`$3A74`) is never started.
- RUN/STOP alone pauses the game (`restore_choose`, `$09B0`).

## Open questions

- Whether the original (uncracked) game's engine differs from this disk's.
- What `$895C`-`$8969` in the briefing were for.
- The timing of level 4's alien and blast frames, and of level 3's burning and flame frames.
