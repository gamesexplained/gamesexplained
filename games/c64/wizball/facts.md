# Wizball — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the image named under Build. The live tests are
listed at the end.

## Build

- Yeti's one-file crack, `WIZBALL    /YETI`; see `orientation.md` for why
  it stands for the original.
- The analysed image is `work/entry.vsf`: the machine stopped at the
  game's entry `$6389`, the whole game unpacked, before its first
  instruction. Play states are `work/play-start.vsf` and
  `work/play-level1.vsf`.
- No build identifier or version string was found in the image.
- **Leftovers of an earlier build.** `$ECB4`-`$ECEA` is an older copy of
  the start-up's tail (vectors from `$B464`, random numbers from `$7304`,
  `JMP $8D5D`), never run; `$BB0D`-`$BB9F` is an earlier draft of Wiztips
  page three; `$6EE4`-`$6F0C`, after a `JMP`, would mark the current
  level's colours done and jump into the level-complete path, and no
  branch reaches it (the test at `$6EC0` for Q branches to the next
  instruction either way). Dead key tests of the same kind sit at
  `$72B5`, `$72D9` and `$9E5A`-`$9E67`.

## Memory layout

The loaded image fills `$0800`-`$FFFF`; the initialisation adds pages 0
to 3. Code is identical in the entry image and in play except for
operands the code rewrites; the game builds its screens, the play
character set's star and level glyphs, and the title sprites at run time.

| Thing | Where |
|---|---|
| Entry | `$6389`: `$01` = `$35`, then `JMP $EC00` |
| Initialisation | `$EC00`-`$ECB3`, inside what becomes screen memory; ends with `JMP $8F61`, the title |
| Outer game cycle | `$639B`-`$63C7`, `JMP $639B`: one turn (one life) a pass |
| Play routine and frame loop | `$63E0`; the loop top is `$640E` |
| Raster IRQ handler | `$7C73` |
| NMI handler | `$7C61` |
| Display-list installer | `$7CB4`, list address in X (low) and Y (high) |
| Random numbers | `$7533`: index `$7532` + 1, returns code byte `$7300` + index exclusive-ORed with CIA 2 timer B's low byte `$DD06` |
| Music and sound driver | `$4553`-`$5524`, command tables `$4600`, `$462A`, `$4654`, tune data `$5525`-`$62D8`; effect player `$B960`-`$BA7A`, effect table `$BACA` |
| Alien slots | `$0200`-`$02FB`, six of 42 bytes, slot k on sprite k + 2 |
| Alien bullets | `$0300`-`$03FF`, sixteen of 16 bytes |
| Shots | `$0480`-`$04C7`, six of 12 bytes (Wiz 0-1, cat 2, spray 3-5) |
| Sound-effect slots | `$0400`, `$0420`, `$0440`: voices 1, 2, 3 |
| Landscape map | `$0532`-`$0B31`: 16 rows of 96 tile numbers; row addresses at `$0460`/`$0470` |
| Level glyph blocks | `$0B42`-`$2641`: nine blocks of `$300`, addressed by the word table `$B31C` |
| Tiles | `$2642`-`$3901`: 192 tiles of 5 x 5 characters |
| Bonus-stage script | `$3902` (copied to `$ED02` to run) |
| Alien types | `$39DC` (20 bonus-stage types) and `$3ECF` (18 landscape types): word tables of 24-byte records |
| Sound effects | 24-byte records from `$3C5F` |
| Wiztips pages | table `$4199`-`$41A4`, pages `$41A5`-`$4552` |
| Variables and tables | `$B000`-`$BFFF` (the per-side block `$B116`-`$B12D`, the scores `$BFDA`-`$BFE7`) |
| Sprites | `$C000`-`$DFFF`, blocks 0-127; `$D000`-`$DFFF` (blocks `$40`-`$7F`) is the RAM under the I/O area, which the video chip reads and the CPU never does |
| Screens (bank 3) | `$E000`, `$E400`, `$E800`: the landscape, three buffers; rows 0-1 of `$E000` are the score line. `$EC00`: the title, menu, Wiztips and get-ready text; in play only its sprite pointers `$EFF8`-`$EFFF` are used (the icon bar) |
| Character sets | `$F000`-`$F1FF` small font, `$F200`-`$F7F7` large font (both loaded, stored inverted); `$F800`-`$FFF7` the play set: glyph 0 blank, `$01`-`$5A` star glyphs drawn at run time, `$5B`-`$7F` small blocks, `$80`-`$9F` ground textures, `$A0`-`$FE` the level's glyphs copied to `$FD00` by `$77C6`, `$FF` the six hardware-vector bytes |

`$77C6` copies the first 760 bytes of the level's block to
`$FD00`-`$FFF7`, stopping before the vectors; in `play-start.vsf` (level 1)
`$FD00`-`$FFF7` equals the entry image's `$1142`-`$1439`.

## Start-up and anti-tamper

- **Initialisation** (`$EC00`): copies twelve bytes from `$EC20` to
  `$001D` (`LDA #$35`, four stores, `PLA`, `RTI`; nothing calls them),
  turns off CIA 1's interrupts, sets the stack pointer to `$7F` and jumps
  through `JMP ($EC91)`, whose pointer is the operand of the `STA` at
  `$EC90`, to `$EC2C`. It reaches CIA 2 only through indexed addresses
  (`STA $DC8E,X` with X = `$7F` is `$DD0D`; `STA $DCC2,Y` with Y = `$42`
  is `$DD04`): timer A = `$4CC7`, started after the raster reaches line
  `$0A` and then `$1E`, with its interrupt enabled as the NMI; timer B
  latched `$FFFF` and left running (the random source). Then it fills
  pages 1-3 with `$81` exclusive-ORed with each index in turn
  (`$EC6F`-`$EC7F`), copies the hardware vectors from `$B62D`
  (NMI `$7C61`, reset `$0000`, IRQ `$7C73`), writes `RTS` at `$EC2C` and
  97 random bytes over `$EC2D`-`$EC8D` (`$EC90`), sets VIC bank 3, stores
  CIA 2's direction and port values over the pointer at `$EC91`/`$EC92`,
  and jumps to the title at `$8F61`.
- **NMI watchdog.** The NMI (`$7C61`) acknowledges CIA 2, clears `$85` and
  returns. Band `$8BBB` stores the `$D011` value in `$85` at raster line
  `$F7`; `$B589` (`LDA #$00`, `LXA #$FF`, `DCP $FF97,X`) decrements it; in
  the next frame band `$8A52` ends with the check at `$8B04`: `LAX $86`
  (A = X = `$FF`), `DCP $FF86,X` (the address wraps to `$0085`),
  `BEQ` past a `PLA`. The check passes only if the NMI came in between;
  otherwise the `PLA` unbalances the stack and the band's `RTS` goes
  astray. The title's bands do the same through `INC $FFB0,X` with X =
  `$D5` (`$93A5`, six times a frame) and the check at `$9287`, whose
  failure path (`$9292`) increments a random byte of memory before
  returning astray. All of this is in undocumented opcodes. *Live*: with
  CIA 2's interrupts switched off in play, the check failed on the next
  frame and the CPU ran into screen memory and stopped on a `JAM` at
  `$EA7D`.
- **The LXA constant.** `LXA #$FF` leaves A = X = (A OR constant) AND
  `$FF`, and the constant differs between 6510 chips. With A = 0 the
  `DCP` at `$B589` reaches `$0085` only when the constant is `$EE`; with
  `$FF` it would decrement `$0096` (a byte of the music driver's voice 1
  template). VICE fixes the constant at `$EE`, with the comment "needs to
  be 0xee for wizball" (`src/6510core.c`, `LXA_MAGIC`).
- **Vector check.** `$90F8`, called from the player menu and the
  get-ready loop, compares `$FFFA`-`$FFFF` with `$B62D`-`$B632` every
  frame and increments `$D021` on any difference.

## Timing

- **The frame loop runs once a frame**: 99 passes of `$640E` in 100 frames,
  PAL (*live*). It waits in `$681D` until the raster is between lines
  `$46` and `$C6` with bit 8 clear.
- **NMI once a frame** (*live*: 99 in 100 frames): timer A's period is
  `$4CC7` + 1 = 19,656 cycles, one PAL frame, so the NMI arrives at the
  same raster position every frame.
- **Raster IRQ about twelve times a frame** in play (*live*: 1,195 in 100
  frames), driven by a display list (below).
- **Seconds are frames / 50.** The shield counts down one unit per 50
  frames (*live*: 40 to 38 in 100 frames); the no-kill timer's 45 seconds
  on level 1 took 2,250 frames (*live*).

## The display list

`$7CB4` stores a list's address in `$68`/`$69`. A list is a first raster
line, a zero, and then 4-byte entries: the routine to run in this band
(low, high), the raster line of the next interrupt, and a zero. The IRQ at
`$7C73` reads the entry at index `$B1CD`, writes the routine's address
into the operand of the `JSR` at `$7C9D`, sets `$D012` to the next line
and calls it. An entry whose next line is 0 ends the list: the handler
sets the index back to 2 and `$D012` to the first line, and the list
repeats every frame.

| List | Installed by | Bands (routine, then next line) |
|---|---|---|
| `$B3E2` | `$63B5`, pointer at `$B414` | `$B90C` `$14`, `$89BB` `$30`, `$8A52` `$3F`, `$B903` `$41`, `$8A25` `$46`, `$8B0F` `$50`, `$8B22` `$E5`, `$B8FC` `$E8`, `$8BCB` `$EE`, `$8B46` `$F7`, `$8BBB` `$FF`, `$B8F3` |
| `$B416` | `$8F89`, pointer at `$B450` | `$AF85` `$16`, `$B90C` `$23`, `$922C` `$64`, `$B903` `$6B`, `$92A2` `$93`, `$9327` `$A0`, `$936A` `$AD`, `$B8FC` `$AF`, `$93A9` `$C0`, `$93B0` `$D0`, `$93B7` `$E0`, `$93BE` `$EE`, `$B8F3` `$F0`, `$93C5` |
| `$B452` | `$9020`, pointer at `$B480` | `$AF85` `$16`, `$B90C` `$48`, `$93CC` `$60`, `$93D9` `$6A`, `$B903` `$78`, `$93E3` `$90`, `$93ED` `$A8`, `$93F7` `$B2`, `$B8FC` `$E6`, `$9419` `$FF`, `$B8F3` |
| `$B482` | `$6BA4`, pointer at `$B4B0` | `$B90C` `$2C`, `$6DD5` `$4E`, `$6DDC` `$6A`, `$B903` `$8E`, `$6DE3` `$A6`, `$6DEB` `$B2`, `$B8FC` `$B6`, `$6DF2` `$CF`, `$6DF9` `$E6`, `$6E00` `$FF`, `$B8F3` |
| `$B4B2` | `$68A3`, pointer at `$B4C4` | `$B90C` `$64`, `$B903` `$B2`, `$B8FC` `$FF`, `$B8F3` |
| `$9549`, `$957B`, `$95A1` | `$9469`, from the word table at `$B86E` | `$9681`, `$9703`, `$970C`, `$972F`, `$971A`, `$9750`, `$9721`, `$9728`; `$9762`, `$97C2`, `$97CB`, `$97D2`, `$97D7`; `$97F0`, `$97FC`, `$9805`, `$9812`; each also runs `$B90C`, `$B903`, `$B8FC`, `$B8F3` |

`$B90C`, `$B903`, `$B8FC` and `$B8F3` run in every list: they are the
sound driver's clock (Sound, below). `$B416` is the title and high-score
page, `$B452` the player menu, `$B482` name entry, `$B4B2` the get-ready
screen, and the last three the Wiztips pages.

**The play screen** (list `$B3E2`), top to bottom:

| From line | Band | Shows |
|---|---|---|
| `$14` | `$89BB` | the icon bar: seven sprites in the opened top border, pointers `$EFF8`-`$EFFE` of screen `$EC00` (`$D018` = `$B0`) |
| `$30` | `$8A52` | rows 0-1 of screen `$E000` in the small font (`$D018` = `$8C`): 1UP, HI, 2UP and the scores; copies the VIC shadow `$E7C4`-`$E7F2` into `$D000`-`$D02E`; ends with the watchdog check `$8B04` |
| `$41` | `$8A25` | the landscape: screen `$E000`, `$E400` or `$E800` by `$B1FD`, characters `$F800`, multicolour, 38 columns, `$D016` = 7 - (`$B1F2` AND 7) |
| rewritten each frame | `$8B0F`, `$8B22` | sprite 0 moved to the Wizball (line Y - 2, list byte `$B3F6`) and to the beam's lower arc (line Y + 20, `$B3FA`) |
| `$E8` | `$8BCB` | black below the landscape |
| `$EE` | `$8B46` | the panel: the level digit (sprite 0, block `$A0`) and the four cauldrons, pointers `$F7F8`-`$F7FF` (`$D018` = `$DC`) |
| `$F7` | `$8BBB` | 24 rows after line 247, so the border never closes: the icon bar and the panel show in it |

## Text

- **Encoding.** Stored text is PETSCII: letters `$41`-`$5A` (shown as
  lower case), space `$20`, digits `$30`-`$39`, punctuation `$21`-`$3F`.
  The printers take `AND #$3F`, which gives the screen code.
- **Records.** A text page is a list of records: a column byte, a row
  byte, the text, `$FF`. A further `$FF` where the next record would start
  ends the page.
- **Printers.** `$8CFA` prints a page in the small font and `$8CF4` in the
  large font (it sets `$B25E`); the record loop is `$8D1F`. The page
  pointer is `$62`/`$63`; the text goes to the screen at `$EC00` (address
  `$EC00` + 40 x row + column) and its colour into colour RAM. In the
  large font the table at `$B591`, indexed by the screen code, gives the
  glyph, which fills two columns and two rows (glyph, glyph + 1, and 40
  bytes on, glyph + `$20` and + `$21`), narrower for screen codes 9 (i)
  and 12 (l).
- **`$8E0E` and `$8E59`** draw text into sprite data instead: each
  character's eight bytes come from the character set at `$F000` and are
  written three bytes apart, the width of a sprite row, exclusive-ORed
  with `$B276` or `$B277`. `$8E59` uses the large-font table `$B591`.
- **Fonts.** The small font (`$F000`-`$F1FF`) is in screen-code order
  (letters from glyph 1, digits from `$30`), except glyphs `$3A`-`$3D`,
  which are H, I, U and P for the score labels. The large gothic font
  from `$F200` has letters a to p at `$40`, `$42`, ... `$5E` with their
  lower halves `$20` on, q to z at `$80`, `$82`, ..., then the WIZBALL
  logo and the digits. Both are stored inverted and flipped as needed by
  `$8C84`/`$8C8D` (small; flag `$F100`) and `$8CB5`/`$8CBE` (large; flag
  `$F6F0`): on the title, menu and Wiztips the letters are background
  pixels, so each band's `$D021` sets the text colour and sprites behind
  the characters show through the letters.
- **Strings** (text only; each is preceded by its column and row unless
  noted): Wiztips pages "wiztips one", "two", "three" (`$41A5`-`$41D1`),
  "getting started" and its icon legend (`$41D6`-`$42A9`), "cat control"
  and the droplet legend (`$42AE`-`$43B4`), "general hints"
  (`$43B9`-`$4550`, ending "continue game feature...."); "game over",
  "player one", "team one", "player two", "team two" (`$6AC9`-`$6B0C`);
  "select permenant" and "weapon" (`$B02F`-`$B04E`, two lines of 16, no
  header or terminator); "all systems go!!" (`$B0FC`, 16 characters, no
  header or terminator: the 0 after it is the variable `$B10C`); "what a
  mega display of fun !!!", "type your name", "and also a few words",
  "wizard", "feline" (`$B635`-`$B690`); "sensi soft" (`$B6AA`, the top
  score's ten-character message); the player menu and "press space for
  wiztips" (`$B6B8`-`$B718`); "get ready!", "wizard", "press fire",
  "player one", "team one", "player two", "team two" (`$B73D`-`$B7D7`);
  "colour completed", "laboratory  imminent" (`$B7EA`-`$B810`);
  "congratulations!", "tishshshshsh", "x  40  x  000" (`$B815`-`$B841`);
  "  wot a wizace!  " (`$B846`, no header); "level 1 completed"
  (`$B858`); the high-score tables (`$BDB9`-`$BEB4`); "top  scores",
  "one  plr", "two  plrs" and the table rows (`$BEB7`-`$BFF1`).
- **"poo bag"** (`$BFF4`-`$BFFD`) is the name-entry buffer as it was left
  in the image: `$6C2C` fills the buffer with spaces before every entry
  and only `$BD46` reads it, so it is never displayed.
- **A stale copy.** `$BB0D`-`$BB9F` repeats part of Wiztips page three,
  from "the horizon gives" to "you want, whil", cut off by the code at
  `$BBA0`. It spells "permanent" where the live page at `$44BD` says
  "permenant"; its row byte `$BB0C` is now a variable, and nothing reads
  it. The two bytes after the entry's `JMP`, `$6390`-`$6391`, read as the
  word `$BB0D`, and nothing reads them either.

## Hardware register census

Every absolute access in the traced code, by register (routine
addresses are the accessing instruction).

| Register | Access | Where | What |
|---|---|---|---|
| `$D000`-`$D007`, `$D010` | write | `$8A73`-`$8BD3`, `$9183`-`$91BA`, `$9256`-`$937D`, `$94F8`-`$9519`, `$89C6`-`$89EA` | sprite positions, per band |
| `$D011` | read and write | `$681D`, `$6E71`-`$6EAF`, `$7CC8`-`$7CCD`, `$8A3A`-`$8A41`, `$8BBB`-`$8BC2`, `$8C47`-`$8C5A`, `$8F43`, `$EC4D` | raster bit 8 in the waits; 25 rows at `$8A3A` and 24 at `$8BBB` (the open border); blanking at `$8C47`-`$8C5A`; vertical scroll always 3 |
| `$D012` | read and write | waits at `$6824`, `$6951`, `$6E4F`-`$6EA8`, `$9088`, `$EC54`; set by the IRQ `$7C95`, `$7CAF`, `$7CC5`; compared at `$926C`-`$973D` | raster |
| `$D015` | write | `$6895`, `$68EF`, `$89EF`, `$8A5A`, `$8B88`, `$8F5B`, `$9052`, `$909C`, `$9234`, `$92C1`, `$9366`, `$947E`, `$94B3` | sprite enable, per band |
| `$D016` | write | `$8A37`, `$8B61`, `$8F48` | the landscape's fine scroll, multicolour, 38 columns (`$8A37`); 40 columns for the panel (`$8B61`) and the text screens (`$8F48`) |
| `$D017`, `$D01B`, `$D01C`, `$D01D` | write | per band and per screen | sprite expansion, priority, multicolour |
| `$D018` | write | `$68B9` (`$BC`), `$89E5` (`$B0`), `$8A2A`, `$8A54` (`$8C`), `$8B5C` (`$DC`), `$8F4D` (`$BC`), `$92A9` (`$BC`), `$931D` (`$BD`) | `$BC`: screen `$EC00`, characters `$F000`; `$B0`: sprite pointers from `$EC00` (no characters shown); `$8C`: screen `$E000`, characters `$F000`; `$8E`/`$9E`/`$AE` (`$8A2A`): the landscape buffer, characters `$F800`; `$DC`: sprite pointers from `$F7F8` |
| `$D019`, `$D01A` | read and write | `$7C74`-`$7C7B`, `$7CD2`-`$7CD5` | raster interrupt acknowledge and enable |
| `$D020`, `$D021` | write | many | border and background, per band |
| `$D022`, `$D023` | write, increment | `$64EB`, `$64EE`, `$652F`, `$6534`, `$7D4D`-`$7D5A`, `$8A0F`-`$8A21`, `$AF5F` | multicolour character colours |
| `$D025`-`$D02B` | write | per band | sprite colours |
| `$D400`-`$D406` | write | `$47D4`, `$4DA0`-`$4DC1`, `$5128`-`$524C`, `$BA3E`-`$BA77`, `$B96A` | SID voice 1 |
| `$D407`-`$D40D` | write | `$4EC3`-`$4EF8`, `$529D`-`$53BA` | SID voice 2 |
| `$D40E`-`$D414` | write | `$5012`-`$5043`, `$5402`-`$54F7` | SID voice 3 |
| `$D415`, `$D416` | write | `$4D13`, `$4D23` | filter cut-off |
| `$D417` | write | `$45CA`, `$49CB`, `$4C38`, `$7DC3` | filter resonance and routing |
| `$D418` | write | `$49D2`, `$4C44`, `$B916`, `$B949` | volume and filter mode |
| `$D3FF`,X | write | `$BAB1` | with X from 1, the SID registers |
| `$D7FF`,Y | write | `$70F0` | with Y from 1, colour RAM |
| `$DC00`-`$DC03` | read and write | `$73D4`-`$745A` | both joystick ports and the keyboard, with the data-direction registers switched around the reads |
| `$DC0D` | write, read | `$EC10`, `$EC13` | CIA 1 interrupts off |
| `$DD00`, `$DD02` | read and write | `$EC9B`-`$ECAB` | VIC bank 3 |
| `$DD04`-`$DD0F` | write | `$EC2C`-`$EC6C` through `$DC86`-`$DCCD` indexed | the NMI timer A and the free-running timer B |
| `$DD06` | read | `$753C` | timer B's low byte, exclusive-ORed into every random number |
| `$DD0D` | read | `$7C62` | NMI acknowledge |

`LDA $DDDD,X` at `$495C`, `$4974`, `$49A6`, `$4AAC`, `$4AE0`, `$4BC9`,
`$4BE1` and `$4C16` is not I/O: the music driver writes the real address
into those operands before they run.

## Controls

- **Keyboard scans.** `$73D4` scans the whole matrix and numbers a key
  1 + 8 x (7 - row) + (7 - column), row being the `$DC00` bit driven low
  (SPACE 4, RETURN `$3F`, DEL `$40`); `$7429`, used in play, scans rows
  7-5 by columns 7-5 only: 1 RUN/STOP, 2 Q, 3 C=, 4 /, 5 up-arrow, 6 =,
  7 comma, 8 @, 9 colon (none of them a line a port-1 joystick can pull).
  Either reports a key in `$B254` only on the scan it first appears.
- **Joysticks** are read around the scans (`$DC00` port 2 into `$B256`,
  `$DC01` port 1 into `$B257`). On the get-ready screen the port on
  which fire is pressed becomes the Wiz's (`$6965`: `$B240` = 0 for port
  2, `$10` for port 1), afresh every turn; `$697D` copies the Wiz's
  stick to `$B23F` and the other to the cat's `$B23E` each frame. *Live*:
  a game started and steered from port 1.
- **One player with the catelite**: holding fire for 10 frames hands the
  stick to the cat while the Wiz fires by itself (`$B241` toggled).
- **In play**: RUN/STOP pauses (`$6EB7`); paused, RUN/STOP resumes and Q
  quits to the title (`$6ED7`, which also clears the continue level and
  BOREWIZ). *Live*. Up-arrow and = raise and lower the firing volume
  `$BA81` (0-15, starts at 10) (`$BA82`).
- **Title, menu and Wiztips** (`$8FF1`, `$907B`, `$94DB`): fire starts a
  game, SPACE shows Wiztips or its next page, a joystick move goes to the
  player menu, where up and down choose one of five modes (`$B272`).
  Keys 0-5 choose the starting level (below); B O R E W I Z sets BOREWIZ.
  The title shows for 750 frames, the menu for 650 (450 again after each
  move), Wiztips for 1,280, before the next screen.
- **Name entry** (`$6B92`-`$6D71`): A-Z, space, the 1 key (as "!"), DEL,
  RETURN (with at least one character).

## Graphics

- **Scrolling** is horizontal only. `$8A25` sets the fine scroll from the
  view's pixel `$B1F2` AND 7; a coarse step switches to one of three
  screens (`$B1FD`), the one shown and two prepared one column left and
  right, rebuilt a quarter per frame by `$77F7`, which is the time eight
  pixels take at the top speed. The view is `$B1F1` (character column),
  `$B1F2` (pixel), `$B1F3` (fraction); its map position is `$B209`
  (tile column), `$B20A` (tile row), `$B20B` (column within the tile).
- **Landscape drawing.** `$78CF` fetches a map column: for four tile rows
  it reads the tile number and copies that column's five characters from
  `$2642` + 25 x tile into `$E79A`-`$E7AD`; a character 0 becomes the sky's
  star glyph for that place (`$7978`).
- **The sky** is 90 glyphs (`$01`-`$5A`) tiled 18 x 5; five stars, one per
  strip, are plotted into them (`$7540`) and moved by `$747E` in four
  parallax layers, twinkling among the multicolours.
- **Colour.** The level's scenery starts in greys (`$D022` dark grey,
  `$D023` grey, the character colour); each finished colour replaces
  one of them, darkest first (`$776D`, `$B27D`-`$B27F`).
- **Sprites.** The Wizball is sprite 0, multiplexed three times a frame:
  the beam's upper arc (shape `$B8DE`, from line `$30`), the Wizball
  (`$8B0F`, line Y - 2) and the lower arc (`$8B22`, line Y + 20). The cat
  is sprite 1; aliens are sprites 2-7 (slot k on sprite k + 2); the icon
  bar is sprites 0-6 in the top border; the panel is the level digit and
  four cauldrons in the bottom border. The Wizball rotates through 16
  shapes (`$10`-`$1F`).
- **Icons** (pointers `$EFF8`-`$EFFE`): 1 thrust (7), then anti-grav (3);
  2 beam (`$0B`), then double (4); 3 catelite (2); 4 blazers (6); 5 spray
  (8 for the Wiz, `$0A` for the cat); 6 smart bomb (1); 7 shield (0). A
  taken icon shows the next thing a take would give, or 9, the used-up
  shape, which `$72DF` refuses. The lit icon cycles in blue (red in the
  lab).
- **Cauldrons**: sprites `$B9` red, `$BA` green, `$BB` blue and `$BC` the
  target colour (`$B51A`), each redrawn one row a frame from sprite
  blocks 56 and 57 (`$9E0D`-`$9EC5`).
- **The level digit** is drawn into sprite `$A0` from the small font,
  each pixel tripled across and each row doubled (`$770D`).

## Mechanics

- **Turns.** The outer cycle (`$639B`) is one life a pass: get ready
  (`$6893`), play (`$63E0`), then game over only for a side's last
  Wizball. Each side starts with three Wizballs (`$6871`); the HUD digit
  shows the spares (`$7D5E`, capped at 9 on screen). In two-side games
  the sides alternate after every life (`$6B3C`), a side's block
  `$B116`-`$B12D` saved to `$E3C0` or `$E3D8` (`$6E08`).
- **Game modes** (`$B2AC`, index `$B272`): one player; two players taking
  turns; a team (one plays the Wiz, the other the cat); a team against a
  player; two teams.
- **The Wizball** stays between lines `$49` and `$C8` (`$8097`). Gravity
  adds `$10`/256 pixel a frame each frame (`$B27C`); a bounce at line 200
  sends it back up at the speed it came down at (`$7F62`), so it bounces for
  ever at one height (*live*: a bounce every 128 passes at 3 + `$F0`/256
  pixels a frame, `$B211`/`$B212`, the top at line 74). The stick spins it
  (6 a frame, up to 48 either way, `$80F8`); the spin becomes rolling
  speed only at a bounce, or every frame once thrust is taken (`$818E`):
  0 below 4, else ((spin - 4) / 8) + 1, speeds 0, 1/8, 1/4, 1/2, 1, 1.5
  and 2 pixels a frame (`$B33D`). Anti-grav stops the bouncing: the stick
  moves it up and down, up to 4 pixels a frame (`$8BEA`). Characters `$98`
  and above are solid (`$83B0`).
- **Death.** A collision with an alien or a bullet, with no shield, sets
  the end-of-life flag `$B1CF` (`$7EF9`, in `$7EA5`); the death sequence runs 199 frames (`$B1D0` from
  200 to 1), with 16 pieces of debris and three sound effects at once.
  *Live*: with no input, level 1 took all three Wizballs in 150 seconds.
- **Icons and pearls.** A pearl lights the next icon; wiggling the stick
  (four reversals, each within 10 frames of the last, `$723D`, counted at
  exactly 4 at `$72D2`) takes the lit one (`$72DF`, table `$B549`).
  Thrust and anti-grav, beam and double, catelite, blazers (shots +3
  characters, colour 12), spray (a fan of three shots; taking it again
  moves it between the Wiz and the cat), smart bomb (every alien's hit
  flag; the icon is not used up), shield.
- **Pearls** come from the ninth kill since the last pearl (`$A9AA` = 9,
  counter `$A9A9`; spheres do not count) and from every molecule (type 1,
  flag bit 5). *Live*. The pearl is worth 100 when collected (`$7E8E`).
- **Shields** (`$73B0`, `$7EA5`): 40 units, one lost every 50 frames and
  8 per collision, a warning below 8, off below 5: 36 seconds with no
  collisions. *Live* (the 50 frames and the 8). The cat's shield is a
  copy (`$89B6`).
- **Shots.** The Wiz fires once per press (`$8444`), two shots at a time,
  in the direction of its last spin; double alternates the direction
  each press, and applies to the Wiz's shots only. The cat fires while
  fire is held (`$881F`). The beam draws arcs above and below the
  Wizball for three steps of four frames, killing what they touch.
- **The cat** (catelite, `$8640`) follows the Wizball's position eight
  frames late, on one side of it (16 pixels left while it spins right, 26
  right while it spins left, sliding across in 21 frames); nine hits
  destroy it (`$B26C`), and the lab restores it. It alone catches
  droplets.
- **Colour droplets.** A shot colour sphere drops a droplet of the level's
  current colour (`$B18B`, into cauldron `$B194`: levels 1, 4, 7 red; 2,
  5, 8 green; 3, 6 blue). The cat catching it adds one unit to that
  cauldron (red, green, blue `$B12B`-`$B12D`, at most 20) and 50 points
  (`$88F0`). A counter `$A763`, raised by `$A765`[level] per sphere shot,
  makes a special droplet when it meets one of five random thresholds
  (`$A772`-`$A776`): white is an extra Wizball, purple the mutant cat (one
  hit from death, random steering, no fire), light blue a filth raid,
  black freaky bits (the scenery in black until it is bumped), and any
  other colour (dark grey) the indestructacat (128 hits) (`$88C2`,
  `$8902`).
- **Colours.** Each level needs three colours (`$B1D1`, four bytes a
  level): 1 red, purple, cyan; 2 brown, orange, yellow; 3 blue, light
  blue, cyan; 4 brown, green, yellow; 5 red, orange, cyan; 6 blue, light
  blue, yellow; 7 red, purple, yellow; 8 brown, light red, cyan. Every C64
  colour has a recipe of red, green and blue units (`$B2C0`, indexed by
  the colour number): red 20/0/0, green 0/20/0, blue 0/0/20, cyan
  0/10/10, purple 10/0/10, yellow 10/10/0, orange 15/5/0, brown 5/10/5,
  light red 10/5/5, light blue 10/0/10. The mix `$B12E` is the sum over
  the cauldrons of min(units, recipe). When it reaches 20 the target
  cauldron's top sprite row is drawn full, `$9E26` copies that byte
  (`$AA`) into `$B874`, and the frame loop leaves for `$646F`: "colour
  completed", the bonus stage, then the Wiz-lab. *Live*: 22 frames after
  the red cauldron was set to 20 on level 1.
- **Aliens.** Six slots at once; a landscape's aliens come from its list
  of (column, type) pairs (`$9F9B`), groups of 4, 6 or 12 of one type,
  spawned as the view uncovers their column (`$A9DA`); clearing a list
  gives 1,000 points and a new list. Only three landscapes have lists:
  the highest open one and the two below it (`$9F5F`). The first list of
  a game is eight molecules (`$A0EC`). Every landscape type is worth 50
  points (template byte 22 = 5); bonus-stage types 0-150.
- **Alien fire.** Firing intervals by level `$A12A`: 70, 65, 50, 40, 37,
  35, 33, 30 frames, 10 in the second round. Colour spheres do not fire
  on levels 1-4, fire aimed from level 5 and eight ways from level 7
  (`$A027`). Bullets are characters `$5B`-`$6A` over the landscape, half
  of them moved each frame (`$99BD`), freed at screen row 23 or over a
  character of `$80` or more: the ground and the scenery stop them.
- **Police.** After `$A1B9`[level] seconds without a kill (45, 40, 25, 20,
  20, 20, 15, 10) a police ship comes (`$A181`), tune 0 a second before.
  *Live* on level 1: the tune at 44 seconds, the ship at 45. A filth raid
  sends six, one every 16 frames (`$A133`); the siren alternates effects
  11 and 12 every 60 frames (`$A974`).
- **Level access.** `$B1CE` = 2 + the number of levels, counted from level
  1 with no gap, whose three colours are done (`$A9C6`). Tubes lead up
  only to it (`$81D3`): a tube mouth (`$C2`, `$C3`, `$C6`, `$C7`) goes up
  when the arrow `$BE` is within three characters to its right, else down
  (`$8389`-`$83A6`). So level 4 opens with level 1 done, level 5 with
  levels 1 and 2 done.
- **Bonus stage** (`$646F`): aliens in formation from the script at
  `$3902` (copied to `$ED02`); a collision ends it without costing a life;
  the tally pays 40 per alien shot (`$6693`). Shooting the spinning
  Wizball lookalike (bonus type 19) gives an extra Wizball (`$A7E2`).
- **Wiz-lab** (`$AB20`): the cauldrons drain one unit per 20 frames (100
  points each, 2,000 for a colour, `$AD8D`), the cat drinks its milk and
  its hits are reset, and the player may take one permanent weapon from
  icons 1-5 (`$B076`) into the list `$B116`-`$B11E`, replayed at the start
  of every life. With no weapon taken the lab pays (9 - level) x 1,000
  (`$ADBB`, level counted from 0).
- **Level complete** (`$AE11`): "wot a wizace!" and "level N completed",
  then the finished landscape scrolls by itself, paying 10 points a
  frame (`$AEAE`). After all eight levels a finale (`$AF20`), then the
  game starts again from level 1 with every alien firing every 10 frames
  (`$B12A`).
- **Score** (`$710B`): points / 10 in A; six digits per side
  (`$BFDB`-`$BFE0`, `$BFE2`-`$BFE7`), the last never changed, so scores end
  in 0; an overflow into the digit before them sets 999,999; a change of
  the 100,000s digit gives a Wizball (`$71BB`). *Live*: a kill of value 5
  added 50.
- **Continue game** (`$AF85`, `$6830`): keys 0-5 on the title or menu pick
  the starting level, counted from 0, up to `$AF7D`, which game over sets
  to the first unfinished level of that game (`$B1CE` - 2; 0 in the loaded
  image). The new game marks the
  skipped levels' colours done and gives the first N of thrust,
  anti-grav, beam, catelite, spray (`$B10D`). *Live* (with `$AF7D` poked).
- **BOREWIZ** (`$AF85`, keys matched against `$AFCE`): sets `$BB07` and
  turns the border brown; collisions then do not end a life, except while
  `$B874` is set (the colour-completed sequence and bonus stage) (`$7EF4`).
  Game over and Q clear it. *Live*.
- **High scores** (`$BBA0`-`$BDA4`): two tables of nine 14-byte entries,
  one-player `$BDB9` and team `$BE37`; the best side's ten-character
  message replaces "sensi soft" on the title. Not saved to disk.

## Data tables

- **Map** `$0532`-`$0B31`: 16 rows of 96 tiles in four bands of four
  rows (`$B2F0` gives each level its band's first row and start). Each
  band holds two landscapes, columns 0-44 and 45-89; columns 92-95 hold
  halves of the Wiz-lab and finale pictures, drawn by jumping four rows
  down and four columns back (`$75DF`).

  | Level | Band (rows) | Columns | Glyph block |
  |---|---|---|---|
  | 1 | 0 (0-3) | 45-89 | `$1142` |
  | 2 | 0 (0-3) | 0-44 | `$0E42` |
  | 3 | 2 (8-11) | 0-44 | `$0B42` |
  | 4 | 3 (12-15) | 0-44 | `$1D42` |
  | 5 | 2 (8-11) | 45-89 | `$1A42` |
  | 6 | 1 (4-7) | 45-89 | `$1742` |
  | 7 | 1 (4-7) | 0-44 | `$1442` |
  | 8 | 3 (12-15) | 45-89 | `$2042` |

- **The stray tile.** `$092B` (row 10, column 57: level 5, just right of
  its first well) holds `$F8`, the only map entry of 192 or more. It is
  drawn from `$2642` + 25 x `$F8` = `$3E7A`, the middle of two sound-effect
  records; among the sky glyphs its bytes make, two are glyph `$FF`
  (the vector bytes) and one is glyph `$64`. *Live*: seen on screen (the
  "matrix in level 5" that Remember's crack fixes by storing `$00`).
- **Tiles** `$2642`-`$3901`: 192 tiles of 5 x 5 characters, grouped by
  level; 14 are never placed.
- **Alien templates** (`$3ECF`, `$39DC`): bytes 0-3 position, 4-7 speed, 8
  movement mode (fall, rise, path-steered, path-accelerated), 9
  acceleration, 10-12 path and its rate, 13 scenery behaviour, 14 fire
  mode (none, aimed, turning, eight ways), 15 fire interval, 16 colour and
  flags (bit 7 police siren, bit 6 hi-res, bit 5 pearl, `$10` colour
  cycling), 17-20 animation, 21 state, 22 points / 10, 23 the number of
  three-byte random fields after it. `$A070` and `$A027` rewrite the
  landscape templates in place for each list built.
- **Frame lists**: frame numbers, then `$FF` n (go back n bytes)
  (`$A5F1`).
- **Bonus script** `$3902`: 99 records of (type, delay); bit 7 of the type
  waits for all six slots to be empty, `$FF`/`$FE` set and clear a speed
  flag, `$FD` ends; a loop is (target, `$39`, count), counted down in the
  copy at `$ED02`.
- **Sound-effect records**: see Sound.
- **Game modes** `$B2AC`, **level colours** `$B1D1`, **recipes** `$B2C0`,
  **no-kill limits** `$A1B9`, **fire intervals** `$A12A`: above.

## Sound

- **Clock.** `$B90C` (in every display list) runs once a frame: the
  volume fade `$45D0`, the sound effects on the voices the music leaves
  free, and the music. `$B8FC`, `$B903` and `$B8F3` run the music again
  when its speed `$B8F2` is 1 (twice a frame) or 2 (four times). `$B8F1`
  says which voices the music uses: 0 none, 1 voice 3 only, 2 all three.
- **The music driver** (`$4553`-`$5524`, Martin Galway): per voice a track
  of note and command bytes with a call-and-loop stack five levels deep;
  22 commands (call, jump, repeat, transpose, instrument and live-state
  writes, filter program, machine-code call, tempo). Each voice has a
  29-byte instrument template (voice 1 `$87`, voice 2 `$4680`, voice 3
  `$A4`) and a 35-byte live state (`$469D`, `$46C0`, `$C1`): four pitch
  steps or an arpeggio, a two-step pulse sweep, gate and release times.
  A shared filter program sweeps the cut-off (`$4CB7`). Notes use the
  91-entry PAL table at `$471A`/`$4775`.
- **Tunes** (`$45F1`, Y = 7 x tune + 5; records at `$5525`): 0 the police
  alarm; 1 and 4 the bonus stage (alternately, `$BB0C`); 2 colour
  completed; 3 the title; 5 get ready; 6 name entry; 7 game over; 8 the
  Wiz-lab.
- **Effects** (`$4553`, records at `$3C5F` through `$BACA`): 26 effects;
  a new one replaces the one on its voice if its priority number is not
  higher, or if the voice's first time counter is 0. A record is voice,
  priority, two gate-on times, waveform, attack/decay, a start flag,
  frequency and its up-and-down sweep, pulse width and its sweep, and
  sustain/release (`$B960`). The shot sound's sustain is the firing
  volume (`$BA82`); with no music the shot alternates voices 1 and 3.
  Effect 10's table entry points at effect 11's record, so the record at
  `$3D4F` is never played.

## Corner cases

Each is what the code does; whether a player can reach it is stated.

- **Shields survive a quit.** Nothing on the way from Q to a new game
  clears the shield timer `$7F06` (written only at `$73B2`, `$7EB9`,
  `$7ED9`, `$7F02` and `$AB14`), so a shield running at the quit protects
  the Wizball in the next game while its icon shows as available. *Live*
  (Remember's bug 2).
- **The spray icon** shows the next take's image like every other icon:
  after the Wiz takes it, the cat spray's (`$7325`). Remember's crack
  swaps the two images (its bug 3).
- **The Wiz-lab list** (`$B0B0`-`$B0D2`): with all nine slots full, taking
  a weapon frees the first two sprays; with fewer than two it jumps to
  itself for ever. *Live* with a poked list; not reachable in play, since
  six weapons at most can be anything but spray.
- **Down tubes** have no lower bound (`$81DB`); level 1's three tubes all
  go up.
- **Q leaves two bytes on the stack** (`$6ED7` pulls one return address of
  two); the stack is reset only by the initialisation.
- **`$8558`** tests `LDA $84FF`, an opcode byte, where the spray flag
  `$B237` looks intended; it always passes, harmlessly.
- **`$A6B1`** reads slot 0's byte `$0D` instead of the current slot's; no
  template has the value that would matter.
- **The pipe copy** at `$831D`/`$8323` starts one byte before sprites 58
  and 59.
- **The pause loop** runs about seven passes a frame (*live*): it waits
  only for the raster to be within lines 205-254.

## Live tests

All on 24 September 2026, VICE 3.10 (vice-mcp 3.13.1), from the snapshots
in `work/`; checkpoints are non-stopping counters unless said.

| Test | How | Result |
|---|---|---|
| Frame loop, IRQ, NMI rates | counters on `$640E`, `$7C73`, `$7C61` over 100 frames | 99, 1,195, 99 |
| NMI watchdog | `$7F` to `$DD0D` in play | `$8B0B` ran once; the CPU stopped on `JAM` at `$EA7D`, screen frozen |
| BOREWIZ | keys by matrix on the title; then a poked collision `$7F0A` = 1 | `$BB07` 0 to 7; with it a hit is ignored, without it the life ends |
| Port 1 | fire on port 1 at the title and get ready, then left and right | the game started and the landscape scrolled both ways |
| Pause and quit | RUN/STOP, then Q (matrix) | the frame loop stopped; Q reached `$8F61`, the title |
| Shields after a quit | take_shield's writes poked, Q, new game | shield 38 at the quit, 36 in the new game, 30 later; a poked collision cost 8 units and no life |
| Continue keys | `$AF7D` = 5 poked, key 4 on the title | the game started on level 5 with levels 1-4 marked done and four permanent weapons |
| The stray tile | level 5, view at tile column 54 | tile `$F8`'s bytes on screen, two `$FF` glyphs and a `$64` beside the first well |
| Police ship | level 1, BOREWIZ, no input | tune 0 at 2,200 frames, the ship at 2,250 |
| Pearls and points | a poked hit on the police ship | counter 0: explosion, counter 1, score +50; counter 8: pearl, counter 0, score +50 |
| Colour completion | red cauldron poked to 20 on level 1 | `$B874` = `$AA` after 22 frames, then `$646F`: "colour completed", the bonus stage |
| Wiz-lab list | nine non-spray weapons poked, spray chosen in the lab | the lab's icons 1-4 showed 9; the CPU stayed at `$B0D2` |
| Level variable | `$B128` poked on the get-ready screen | only the glyphs change: the view is built from the map before the poke |
| No input on level 1 | play-start, 150 s | three Wizballs lost, 50 points each time |
