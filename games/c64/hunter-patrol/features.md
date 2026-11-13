# Hunter Patrol: features

What the game is documented to do, with verification status against the code and the emulator. Statuses: **open**, **traced**, **confirmed**, **live**, **differs**.

Sources:

- The cracker's documents on the disk (screen text kept at `$C000`, "Documents to Hunter Patrol", typed by Jack Alien for Remember), read in the emulator on 13 November 2026.
- Wikipedia, "Hunter Patrol", read 13 November 2026 through a fetch tool: developer, publisher, composer, year, the description of the targets, the comparison to Buck Rogers: Planet of Zoom.
- gb64.com, "Game of the week" page for Hunter Patrol, `gb64.com/oldsite/gameofweek/7/gotw_hunterpatrol.htm`, read 13 November 2026: the premise, the distance bar, the enemies, the ZZAP!64 issue 7 review text and scores.
- C64-Wiki, Lemon64 and the Everygamegoing pages could not be read: the fetch tool failed or returned an empty page on 13 November 2026.

## Features

| Feature | Status | Where |
|---|---|---|
| A fighter flies over a ground scrolling by in a 3D view, seen from behind | live | screenshots in `reference/`; the picture is split into bands by the raster interrupt `$13AB` |
| Joystick only, port 1 | live | the stick is read from `$DC01` at `$0D14`; `vice_joystick_set` port 1 moves the plane, and the documents say "Joystick in Port one only" |
| Joystick up makes the plane dive, down makes it climb | live | `$193C` sets the climb rate `$37` to +1 on down and -1 on up; `$1990` then moves sprite 0's height `$8061` by it (held up for 24 frames moved the height from `$51` to `$5E`) |
| Left and right set the ground's scroll speed and direction; the plane stays at x `$A0` | live | `$22` goes to `$FE` on left and `$02` on right; `$8060` stayed at `$A0` |
| Fire shoots | confirmed | `$1E40` takes a free record for a shot; hits are resolved by `$22D0` and `$2CD0` through the sprite collision latches `$3D` and `$3E` |
| Four kinds of ground defence must be destroyed before the target | confirmed | `$29E0` counts them in `$41`; at 4 the target run begins (`$2A4C` sets `$41` to `$80`) |
| Each kind takes more hits as the level rises | confirmed | `$0F60` sets the hits needed `$42` to 5, 10, 20 and 20 for level `$44` of 0 to 3 |
| A bar at the bottom of the screen shows the distance to the target | live | drawn by `$29E0` into screen memory at `$4970`; it fills with a plain colour as defences go |
| Enemy aircraft fly in the top of the screen | live | the record table at `$8880`, started by `$2680` |
| Flak: bursts from over the horizon | open | the description is from the sources, the routine is not identified yet |
| The target is strafed once for each life that remains | open | documented in the cracker's documents; `$2A4C` starts the target run with the lives in `$43`; the strafing count has not been traced |
| Messages after the target, by hits: destroyed (64 or more), heavy damage (48), partly damaged (16), undamaged, try again (under 16) | confirmed | texts at `$8BA0-$8C00`, picked by `$2E30` from `$45` through the pointers at `$8B90`; read from the program, the messages were not seen in play |
| Extra life and the next level for a big enough rating | confirmed | `$2EA1`: with `$45` at `$10` or more, lives (`$40`, at most 9) and level (`$44`) go up |
| Four lives to start; a life is lost when the plane explodes | live | `$24F0` sets `$40` to 4; `$2400` takes one after the explosion |
| High score table of five, with name entry of up to twelve letters | confirmed | `$1210`, `$12D0`; table at `$4122` |
| Music by Rob Hubbard on the title screen | confirmed | driver at `$A000`; ZZAP!64 says it is "not one of Rob Hubbard's better pieces" |
| RESTORE restarts the game | open | stated in the cracker's documents; not tried |

## Beyond the documentation

- The three better messages pay alike: 16 hits or more gives an extra life and the next level (`$2EA1`).
- The title tune is the only music: the interrupt that plays it is replaced when play starts (`$0314` was `$AE03` on the title screen and `$13AB` in play).
- The loading picture is shown by the cracker's loader, so it is not part of Mastertronic's game. Whether the original tape or disk had one is not known.

## Open questions

- What sets `$45`, the target's damage count, and how many strafing runs a life buys.
- What the flak is in the code, and whether any other object type exists.
- How many levels there are: `$44` runs from 0 to 3 and then wraps to 0, so four, but this was read from the code only.
