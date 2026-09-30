# Chiller — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The cassette inlay (the manual), two scans on the Internet Archive:
  <https://archive.org/details/Chiller_1984_Mastertronic> and
  <https://archive.org/details/Chiller_1984_Mastertronic_2648_Instructions>,
  their OCR text read 28 September 2026. Both say © Mastertronic Limited
  1984. This is the main source.
- The game's own screens, captured from `work/play-idle.vsf` and from a boot
  of the contributor's PRG on 28 September 2026 (`reference/`).
- Lemon64 entry 468, read through the Internet Archive's copy
  (<https://web.archive.org/web/2022/https://www.lemon64.com/game/chiller>)
  on 28 September 2026, since the live site answers only a browser check.
  Credits, control port and magazine reviews.
- Games That Weren't, "Chiller V1",
  <http://www.gamesthatwerent.com/gtw64/chiller-v1/>, read 28 September 2026.
  Covers the withdrawn first version and its music.
- Italian Wikipedia, "Chiller (videogioco 1984)",
  <https://it.wikipedia.org/wiki/Chiller_(videogioco_1984)>, read 28
  September 2026, and its screenshot `reference/wiki-it-forest.png`.
- C64-Wiki has no page for the game: `https://www.c64-wiki.com/wiki/Chiller`
  answered 404 on 28 September 2026, and so did `Chiller_(Mastertronic)`,
  `Chiller_(1985)` and `Chiller_(game)`. The wiki's search was not reachable.
  English Wikipedia's "Chiller (video game)" is Exidy's 1986 arcade game, a
  different game.

What the sources say about who made it: code by Richard Darling and graphics
by David Darling (Games That Weren't); "Creator: David Darling, Richard
Darling", title screen by Jim Wilson and music by David Dunn (Lemon64). The
game's own title screen says "PROGRAMMED BY DAVID AND RICHARD DARLING".

## Features

**Where** names the routine or table and, for *live* rows, the test
(`facts.md`, Live tests; scripts in `work/`).

| Feature | Status | Where |
|---|---|---|
| The boy walks left and right | **live** | `player_input` `$C71B`, `try_move` `$2A04`; stick right X 128 → 151 |
| The boy jumps (stick up, or SHIFT) | **live** | `fire_pressed` `$C19D`, `start_jump` `$5418`, `jump_speeds` `$544A`; stick up Y 224 → 205 → 220. SHIFT: the emulator's key-injection tools have no name for it, so `work/verify_shift.py` held the KERNAL's own shift flag `$028D` at 1 directly, re-poking it every frame since `SCNKEY` overwrites it 60 times a second; Y 224 → 205, in-air flag 1 within 30 frames |
| The boy can also run; walking, running and jumping each cost more energy than the last | **differs** | There is one walking speed and no run. Walking costs a step per about 765 passes (`walk_drain` `$5A20`), jumping a step each time `$5A09` runs out (`drain_step` `$59E6`); standing costs nothing |
| An energy bar drains, and enemies touching the boy drain it | **live** | `sprite_touch` `$CE87` → `poison_add` `$5B44`; standing still, 69 hits on each when an enemy reached him (`verify7.py`) |
| No energy means the game is over | **live** | `out_of_energy` `$5A70`, `screen_done` `$5D98`; GAME OVER (`reference/game-over.png`) |
| Eating mushrooms restores energy | **live** | tile `$54`, `tile_touch_b` `$5AC7`, `energy_add_slow` `$5B18`: 23 steps; bar 119 → 142 against a control of 119 → 119 |
| Some mushrooms are poisonous toadstools | **live** | tile `$55`: 24 steps of poison, each with a border flash (`poison_tick` `$5B2C`, `flash_border` `$72BA`) |
| All the magic crosses must be collected to leave a screen | **live** | `crosses_left` `$7F00` from the record's `+$72`: five going out, ten coming back; five poked crosses ended the forest |
| HUD: score, magic crosses collected, high score, energy bar | **live** | `hud_template` `$8400`, copied by `start_game`; score `$0406`, crosses `$041C`, bar `$042E` |
| Enemies: ghouls, zombies, ghosts and bats | **traced** | Five slots on sprites 2-6, moved by `path_step` `$CC12` along a per-slot path script decoded from `path_scripts` `$4A00`-`$4A8F` (direction bytes 0-3 ended by `$FF`), and a thrown sixth on sprite 7 (`extra_enemy` `$CCF5`); which shape is which of the manual's names is not in the code |
| Five screens: forest, cinema, ghetto, graveyard, haunted house | **live** | `level_records` `$7290`; all reached by play (`reference/screen-00-forest.png` to `screen-04-house.png`) |
| A card names each screen and says what to do | **live** | `show_level_card` `$5BC7`, cards `$4100`-`$44E8` |
| After the haunted house, the same five screens in reverse, with the girl | **live** | records `$7300`-`$7500`; `reference/screen-05-house-back.png` to `screen-09-forest-back.png` |
| On the return journey only, fire (or `?`) switches control between the boy and the girl | **live** | `switch_request` `$58B3`, `switch_allowed` `$7280` (level byte 10 on); `/` in the forest did nothing, fire and `/` on the way back gave the girl |
| On the return journey, the border colour shows who is being controlled | **live** | `tick_border` `$75B0`: 6 the boy, 10 the girl; border 6 → 10 on the switch. It also shows on the way out, where it is always the boy's |
| On the return journey, the boy collects the blue crosses and the girl the red ones | **live** | `cross_touch` `$7F50` reads colour bit 2; red crosses beside the boy were left |
| The goal is to get back to the car | **differs** | The last screen is the forest; after it `crosses_left` passes `$FE` and the game ends in a win. No car is drawn or named in the code |
| Joystick in control port 2 | **live** | `$DC00` only (`read_stick` `$C9C4`) |
| Keyboard: Z left, C right, SHIFT jump, `?` switch players | **live** | `read_controls` `$C84D` against `$4512`-`$4515`: Z and C walk, `/` (`$C5 = $37`) switches; tested through `vice_keyboard_key_press` |
| A title screen with the credits and the controls, shown after a game ends | **live** | `game_over_wait` `$7720`, title card `$7C00` |
| Music | **traced** | `music_irq` `$60F5`, the play tune `$61F8`, the card tune and jingle `$6A18`-`$6BCC`. Pitches computed for NTSC. Not heard: the tools give no audio |
| The first release played a version of *Thriller*, withdrawn and replaced with new music | **traced** | This copy is the first release: its tune data matches the steward's V1 transcription byte for byte (`facts.md`, top) |

## Beyond the documentation

Found in the code, not in the manual (`facts.md`, Mechanics, Unused code
and data, Bugs):

- **The way back is the same screens as you left them.** Each outward
  screen is copied into a store as you leave it (`screen_store` `$7FE8`),
  four of them into the RAM under the KERNAL, and the way back reads them
  from there. A mushroom eaten going out is gone coming back.
- **No fall ever hurts.** `land` `$53EF` compares the fall with a limit
  and then does nothing: NOPs.
- **The ledges crumble.** Tiles `$4D`-`$53` step to the next stage every
  8th step on them and the last becomes a space.
- **The boy's own position is capped at row 22 of 24.** `move_sprite`'s
  own Y clamp holds him there even in free fall over open space. The game
  still reads rows 23 and 24 for crosses, through the cell below or beside
  him, so every cross can be taken; see "Can every cross be reached?",
  below.
- **No ending.** After the last level the game loads the forest again,
  score kept.
- **The enemies speed up.** When every slot's lives are spent, the LEVEL
  counter goes up and `speed_up` `$5681` halves their delays.
- **The border is the player indicator on every screen**, not only on the
  way back, and flickers while poison drains the bar.
- **Enemies that could be killed.** Hit and kill code with a points
  table, lives, a scroller and a second-character mode, none reached.
- **A silenced sound player** whose SID stores all go to `$FFFF`.
- **SILVER CROSSES**, in HUD rows that are never shown.
- **Bugs**: PRESS CTRL FOR MENU never appears (the routine only loads);
  the jump sound's pitch falls when it should rise; the title flicker
  writes a level record instead of `$D023`.

## Open questions

- **Which release is this?** Settled for Gold: the first, withdrawn *Thriller* release. Its music player and all 4,238 bytes of tune data at `$61F2`-`$727F` match `Music/v1music.asm` in the steward's https://github.com/unorig/Chiller (branch Latest) byte for byte, and about 1,650 differ from `v2music.asm`; the steward confirmed on 29 September 2026 that V1 is the withdrawn release. The re-release changes the in-play tune and the gate-off compare at `$60B6` (3 to 1); its data is in `reference/music-v2.json` for the page's player.
- **Can every cross be reached?** Settled for Gold: yes. A Lemon64 user
  comment (2022) remembered the game as impossible to finish because one
  cross was out of reach, later fixed by a crack. The three lowest crosses
  (graveyard-back `$079A`, ghetto-back `$07C5`, cinema-back `$07CC`) were
  each taken on the game's own code on 29 September 2026 by walking left
  along the ground, and the steward played this release through all ten
  levels the same day, taking every cross (`facts.md`, "Every cross can be
  taken"). Whether the crack the comment mentions changed anything is not
  known.
- **Which of the manual's enemies is which.** Sprites 2-6 are the five
  enemy slots and 7 the thrown one (`facts.md`); the manual's ghouls,
  zombies, ghosts and bats are not named in the code, so matching them
  to shapes is by eye only.
- **The picture nobody placed.** Games That Weren't shows a screenshot
  from *Your Commodore* that matches no screen in the released game.
  Noted in case a stray bitmap turns up in the sweep.
