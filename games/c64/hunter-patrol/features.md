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
| A fighter flies over a ground scrolling by in a 3D view, seen from behind | live | screenshots in `reference/`; three raster bands, `$13AB` |
| Joystick only, port 1 | live | `$0D14` reads `$DC01`; the documents say "Joystick in Port one only" |
| Joystick up makes the plane dive, down makes it climb | live | `$193C` sets `$37` to `$FF` on up; up held 40 frames moved y `$8061` from `$51` to `$67` |
| Left and right turn; the plane stays at x `$A0` and the ground slides | live | `$22` between `$FE` and `$02`; `$8060` is never written; `$2220` moves every object |
| Fire shoots, one shot at a time | confirmed | `$1E40` uses only shot record 0 |
| Four kinds of ground defence must be destroyed before the target | confirmed | `$41` counts the kinds, `$29E0` moves on when `$42` reaches 0, `$2A4C` starts the runs |
| Each kind takes more hits as the level rises | confirmed | `$0F60`: 5, 10, 20, 20 |
| A bar at the bottom shows the distance to the target | live | `$29E0` fills a section of characters at `$4970` per kind |
| Enemy aircraft fly in the sky and can be shot for points | confirmed | records `$8530`, started by `$1A10`; 50 points, and the hit counts towards the kind (`$22D0`) |
| Flak bursts over the plane and destroys it on contact | confirmed | `$2680` starts it, `$2700` bursts it; the ground band's plane-flak collision starts the crash (`$22D0`) |
| The target is strafed once for each life that remains | confirmed | `$2A4C`: runs numbered from the lives down to 0, so one more than the documents' count; a crash costs a life and ends the run |
| Messages after the target, by hits | confirmed | `$2E30`: 64, 48, 16, fewer, through `$8B90` |
| Extra life and the next level for a big enough rating | confirmed | `$2EA1`: 16 hits or more; lives at most 9 |
| Four lives to start; a life is lost when the plane explodes | live | `$24F0` sets `$40` to 4; `$2400` takes one at `$3F` = `$A0` |
| High score table of five, with name entry of up to twelve letters | confirmed | `$1210`, `$12D0`; saved by the cracker's `$0C55` |
| Music by Rob Hubbard on the title screen | confirmed | driver at `$A000`, played on the Music tab by its own code |
| Later levels are faster and the flak meaner | differs | the documents say so; the code changes only the hits needed (`$0F60`) and the target set (`$8B80`) with the level |
| RESTORE restarts the game | live | "CBM80" at `$8000` points the NMI at `$2F30`; a press in play reached it |

## Beyond the documentation

- A second tune player at `$1000-$116F` with its own tune at `$8200` that nothing calls; the Music tab plays it.
- The three better messages pay alike: 16 hits or more gives an extra life and the next level (`$2EA1`).
- Any hit on the target darkens its middle part (`$80BC`), and a colour read per level is thrown away (`$2BCF`).
- The flak cannot crash the plane during a strafing run: the run's test looks for sprite 7 (`$2D86`).
- The texts misspell "STRAFFING" and "TARTARGET".
- The cracker's trainer patches `$1934` to `$0D03`: the C= key ends the level as a destroyed target.
- The loading picture is shown by the cracker's loader and signed "Jim". Whether the original tape or disk had one is not known.

## Open questions

- Who "Jim", the loading picture's artist, is.
- Whether the original Mastertronic release had the loading picture, the second tune, or the "CBM80" restart, or the cracker added them.
- Whether a ground object hit at its nearest size can show the filled block `$D2`.
