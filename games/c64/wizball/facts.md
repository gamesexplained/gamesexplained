# Wizball — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- Yeti's one-file crack, `WIZBALL    /YETI`; see `orientation.md` for why
  it stands for the original.
- The analysed image is `work/entry.vsf`: the machine stopped at the
  game's entry `$6389`, the whole game unpacked, before its first
  instruction. Play states are `work/play-start.vsf` and
  `work/play-level1.vsf`.
- No build identifier or version string was found in the image.

## Memory layout

The loaded image fills `$0800`-`$FFFF`. Code is identical in the entry
image and in play except for operands the code rewrites; the game builds
its own screens and the level graphics in bank 3 at run time.

| Thing | Where |
|---|---|
| Entry | `$6389`: `$01` = `$35`, then `JMP $EC00` |
| Initialisation | `$EC00`-`$ECB3`, in RAM under the KERNAL, inside what becomes screen memory; continues at `$8F61` |
| Outer game cycle | `$639B`-`$63C7`, `JMP $639B` |
| Play routine and frame loop | `$63E0`; the loop is `$640E`-`$646E` |
| Raster IRQ handler | `$7C73` |
| NMI handler | `$7C61` |
| Display-list installer | `$7CB4`, list address in X (low) and Y (high) |
| Music and sound driver | code at `$4553`-`$5524`; command handler tables at `$4600`, `$462A`, `$4654` |
| Wiztips pages | `$41A2`-`$4550`, text records |
| Screen text records | `$6AC9`-`$6B0C`, `$B635`-`$B868`, `$BEB5`-`$BFFF` |
| Screens | `$EC00` (title, high scores, Wiztips, the HUD bands in play) and `$E000` (the landscape band in play), both in VIC bank 3 |
| Character sets | `$F000` (title and text screens: loaded; in play it holds a level set the game builds) and `$C000` |
| Blocks copied to `$FD00` | the word table at `$B31C` begins with eleven words, `$1142 $0E42 $0B42 $1D42 $1A42 $1742 $1442 $2042 $2342 $2342 $0E42`, blocks `$300` apart from `$0B42` to `$2641`; in `play-start.vsf` (level 1) `$FD00`-`$FFF7` equals the entry image's `$1142`-`$1439`, and `$FFF8`-`$FFFF` hold the game's vectors |
| Record tables | word tables at `$39DC` (20 entries, records of 24 bytes from `$3A04`), `$3ECF` (18 entries from `$3EF3`) and `$BACA` (24 entries of 24 bytes from `$3C5F`) |

## Timing

- **The frame loop runs once a frame**: 99 passes of `$640E` in 100 frames,
  PAL (*live*). It waits in `$681D` until the raster is between lines
  `$46` and `$C6` with bit 8 clear.
- **NMI once a frame** (*live*: 99 in 100 frames). The initialisation sets
  CIA 2 timer A to `$4CC7` (19,656 cycles, one PAL frame), waits for raster
  line `$0A` and then `$1E`, starts the timer and enables its NMI
  (`$EC2C`-`$EC6C`, all through indexed addresses: `STA $DC8E,X` with X =
  `$7F` is `$DD0D`). So the NMI arrives at the same raster position every
  frame. `$7C61` acknowledges it (`LDA $DD0D`) and writes 0 to `$85`.
- **Raster IRQ about twelve times a frame** in play (*live*: 1,195 in 100
  frames), driven by a display list (below).

## The display list

`$7CB4` stores a list's address in `$68`/`$69`. A list is a first raster
line, a zero, and then 4-byte entries: the routine to run in this band
(low, high), the raster line of the next interrupt, and a zero. An entry
whose next line is 0 ends the list. The IRQ at `$7C73` reads the entry at
index `$B1CD`, writes the routine's address into the operand of the
`JSR` at `$7C9D`, sets `$D012` to the next line and calls it.

| List | Installed by | Bands (routine, then next line) |
|---|---|---|
| `$B3E2` | `$63B5`, pointer at `$B414` | `$B90C` `$14`, `$89BB` `$30`, `$8A52` `$3F`, `$B903` `$41`, `$8A25` `$46`, `$8B0F` `$50`, `$8B22` `$E5`, `$B8FC` `$E8`, `$8BCB` `$EE`, `$8B46` `$F7`, `$8BBB` `$FF`, `$B8F3` |
| `$B416` | `$8F89`, pointer at `$B450` | `$AF85` `$16`, `$B90C` `$23`, `$922C` `$64`, `$B903` `$6B`, `$92A2` `$93`, `$9327` `$A0`, `$936A` `$AD`, `$B8FC` `$AF`, `$93A9` `$C0`, `$93B0` `$D0`, `$93B7` `$E0`, `$93BE` `$EE`, `$B8F3` `$F0`, `$93C5` |
| `$B452` | `$9020`, pointer at `$B480` | `$AF85` `$16`, `$B90C` `$48`, `$93CC` `$60`, `$93D9` `$6A`, `$B903` `$78`, `$93E3` `$90`, `$93ED` `$A8`, `$93F7` `$B2`, `$B8FC` `$E6`, `$9419` `$FF`, `$B8F3` |
| `$B482` | `$6BA4`, pointer at `$B4B0` | `$B90C` `$2C`, `$6DD5` `$4E`, `$6DDC` `$6A`, `$B903` `$8E`, `$6DE3` `$A6`, `$6DEB` `$B2`, `$B8FC` `$B6`, `$6DF2` `$CF`, `$6DF9` `$E6`, `$6E00` `$FF`, `$B8F3` |
| `$B4B2` | `$68A3`, pointer at `$B4C4` | `$B90C` `$64`, `$B903` `$B2`, `$B8FC` `$FF`, `$B8F3` |
| `$9549`, `$957B`, `$95A1` | `$9469`, from the word table at `$B86E` | `$9681`, `$9703`, `$970C`, `$972F`, `$971A`, `$9750`, `$9721`, `$9728`; `$9762`, `$97C2`, `$97CB`, `$97D2`, `$97D7`; `$97F0`, `$97FC`, `$9805`, `$9812`; each also runs `$B90C`, `$B903`, `$B8FC`, `$B8F3` |

`$B8F3`, `$B8FC`, `$B903` and `$B90C` run in every list.

## Text

- **Encoding.** Stored text is PETSCII: letters `$41`-`$5A` (shown as
  lower case), space `$20`, digits `$30`-`$39`, punctuation `$21`-`$3F`.
  The printers take `AND #$3F`, which gives the screen code.
- **Records.** A text page is a list of records: a column byte, a row
  byte, the text, `$FF`. A further `$FF` where the next record would start
  ends the page.
- **`$8D1F`** prints a page to the screen at `$EC00` (address
  `$EC00` + 40 × row + column) and its colour into colour RAM, from the
  page pointer in `$62`/`$63`. With `$B25E` non-zero each letter is drawn
  in the large font instead: the table at `$B591`, indexed by the screen
  code, gives the glyph, which fills two columns and two rows (glyph,
  glyph + 1, and 40 bytes on, glyph + `$20` and + `$21`), narrower for
  screen codes 9 (i) and 12 (l).
- **`$8E0E` and `$8E59`** draw text into sprite data instead: each
  character's eight bytes come from the character set at `$F000` and are
  written three bytes apart, the width of a sprite row, exclusive-ORed
  with `$B276` or `$B277`. `$8E59` uses the large-font table `$B591`.
- **The character set at `$F000`** (the entry image) is in screen-code
  order for glyphs 0-63 (letters from glyph 1, digits from `$30`), except
  glyphs `$3A`-`$3D`, which are H, I, U and P for the score labels. From
  glyph `$40` it holds the large gothic font: letters a to p at `$40`,
  `$42`, ... `$5E` with their lower halves `$20` on, q to z at `$80`,
  `$82`, ...; then the WIZBALL logo.
- **Strings** (text only; each is preceded by its column and row):
  Wiztips pages "wiztips one", "two", "three" (`$41A4`-`$41D1`), "getting
  started" and its icon legend (`$41D6`-`$42A9`), "cat control" and the
  droplet legend (`$42AE`-`$43B4`), "general hints" (`$43B9`-`$4550`,
  ending "continue game feature...."); "game over", "player one", "team
  one", "player two", "team two" (`$6AC9`-`$6B0C`); "select permenant
  weapon" (`$B02F`, no prefix, padded with spaces); "all systems go!!"
  (`$B0FC`, ends with `$00`); "what a mega display of fun !!!", "type your
  name", "and also a few words", "wizard", "feline" (`$B635`-`$B690`);
  "sensi soft" (`$B6AA`); the player menu and "press space for wiztips"
  (`$B6B8`-`$B718`); "get ready!", "wizard", "press fire", "player one",
  "team one", "player two", "team two" (`$B73D`-`$B7D7`); "colour
  completed", "laboratory  imminent" (`$B7EA`-`$B810`);
  "congratulations!", "tishshshshsh", "x  40  x  000" (`$B815`-`$B841`);
  "  wot a wizace!  " (`$B846`, no prefix); "level 1 completed" (`$B858`);
  the high-score tables (`$BDB9`-`$BEB4`); "top  scores", "one  plr",
  "two  plrs" and the table rows (`$BEB7`-`$BFF1`); "poo bag   "
  (`$BFF4`-`$BFFD`, ten characters, no terminator).
- **A stale copy.** `$BB0D`-`$BB9F` repeats part of Wiztips page three,
  from "the horizon gives" to "you want, whil", cut off by the code at
  `$BBA0`. It spells "permanent" where the live page at `$44BD` says
  "permenant".

## Hardware register census

Every absolute access in the traced code, by register (routine
addresses are the accessing instruction).

| Register | Access | Where | What |
|---|---|---|---|
| `$D000`-`$D007`, `$D010` | write | `$8A73`-`$8BD3`, `$9183`-`$91BA`, `$9256`-`$937D`, `$94F8`-`$9519`, `$89C6`-`$89EA` | sprite positions, per band |
| `$D011` | read and write | `$681D`, `$6E71`-`$6EAF`, `$7CC8`-`$7CCD`, `$8A3A`-`$8A41`, `$8BBB`-`$8BC2`, `$8C47`-`$8C5A`, `$8F43`, `$EC4D` | raster bit 8 waits; vertical scroll and screen control ? |
| `$D012` | read and write | waits at `$6824`, `$6951`, `$6E4F`-`$6EA8`, `$9088`, `$EC54`; set by the IRQ `$7C95`, `$7CAF`, `$7CC5`; compared at `$926C`-`$973D` | raster |
| `$D015` | write | `$6895`, `$68EF`, `$89EF`, `$8A5A`, `$8B88`, `$8F5B`, `$9052`, `$909C`, `$9234`, `$92C1`, `$9366`, `$947E`, `$94B3` | sprite enable, per band |
| `$D016` | write | `$8A37`, `$8B61`, `$8F48` | horizontal scroll ? |
| `$D017`, `$D01B`, `$D01C`, `$D01D` | write | per band and per screen | sprite expansion, priority, multicolour |
| `$D018` | write | `$68B9` (`$BC`), `$89E5` (`$B0`), `$8A2A`, `$8A54` (`$8C`), `$8B5C`, `$8F4D` (`$BC`), `$92A9` (`$BC`), `$931D` (`$BD`) | `$BC`: screen `$EC00`, characters `$F000`; `$B0`: screen `$EC00`, characters `$C000`; `$8C`: screen `$E000`, characters `$F000` |
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
| `$DC00`-`$DC03` | read and write | `$73D4`-`$745A` | both joystick ports, with the data-direction registers switched around the reads |
| `$DC0D` | write, read | `$EC10`, `$EC13` | CIA 1 interrupts off |
| `$DD00`, `$DD02` | read and write | `$EC9B`-`$ECAB` | VIC bank 3 |
| `$DD04`-`$DD0F` | write | `$EC2C`-`$EC6C` through `$DC86`-`$DCCD` indexed | the NMI timer (above) |
| `$DD06` | read | `$753C` | CIA 2 timer B low byte, exclusive-ORed in: a random source ? |
| `$DD0D` | read | `$7C62` | NMI acknowledge |

`LDA $DDDD,X` at `$495C`, `$4974`, `$49A6`, `$4AAC`, `$4AE0`, `$4BC9`,
`$4BE1` and `$4C16` is not I/O: the music driver writes the real address
into those operands before they run (`$499B`/`$49A1` for the one at
`$49A6`).

## Controls

## Graphics

## Mechanics

## Data tables

## Sound

## Live tests
