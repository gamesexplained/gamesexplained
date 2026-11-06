# Alter Ego — verified technical facts

What is true of the game as a whole: how its parts follow one another, and what they share. Each part's own facts are in `parts/<id>/facts.md`: the resident program in [`parts/main`](parts/main/facts.md), the start in [`parts/start`](parts/start/facts.md), a life's seven phases in [`parts/life`](parts/life/facts.md). Unless marked *live*, a fact comes from reading the code in the snapshots `orientation.md` names; *live* means seen on the kit's C64 running the game's own code, in the sessions under "Live tests".

## Build

The male edition, from the C64 Preservation Project's original disks `alter_ego_male_s1` to `s6` (Activision, 1987): six disk sides. The loader's own files (ACTIVISION, SIGNI1, SIGNI2, 1985, COPYRIGHT) bring the title up and jump to `$4000`, where the game's program begins; the game never opens them again.

## How the program is made

Most of the game is not 6502 code. It is a program compiled for a stack machine of 16-bit values (p-code), run by the interpreter at `$7033-$7926` in the resident program: fetch and dispatch at `$713C`, through the two 256-entry handler tables at `$7927` (low bytes) and `$7A27` (high bytes). Its registers are in zero page: `$04/$05` the expression stack pointer, growing down from `$CFFF`; `$06/$07` the frame pointer; `$08/$09` the instruction pointer; `$0A/$0B` the primary value and `$0E/$0F` the secondary. A p-code procedure starts with `JSR $70F8` and a word, the frame's size; a 6502 routine with a frame of its own starts with `JSR $7059`, a byte (the zero-page workspace it saves) and a word. 48 opcodes have no handler: all of them point at the BRK at `$7893`.

The program is in three loads, the listing's three parts:

| Part | Where | What |
|---|---|---|
| `main` | `$4000-$8465` | the resident program: the interpreter, a C library (files, strings, 32-bit arithmetic), the display, the arrow, the KERNAL wrappers and the fast loader; the game's top level at `$4003` |
| `start` | `$8466-$9991` | the start object: the title's menu, a saved life resumed, the player's name, the questionnaire and its scoring, the phase to begin in |
| `life` | `$8466-$CC69` | the life object: a phase of life played on its map, scene by scene, the status pages, saving and loading |

The top level (`initialize_alter_ego_runtime`, `$4003`) opens MAP1 and reads three objects from it, each a word of its address, a word of its length and its bytes (`read_length_prefixed_stream_object`, `$4AEE`): the pictures of the map and the choices, to `$E800`; the scene strings, to `$E000`; and the start object, to `$8466`. It calls the start object through a pointer (`call_vm_function_pointer`, `$4B4F`) and reads the life object over it from where the start object ended in MAP1, then calls that with the phase the start object returned. The life object returning 2 begins the whole cycle again; anything else ends in the KERNAL's reset (`$FCE2`, through `$7FC8`).

## Memory layout

| Thing | Where |
|---|---|
| Hires bitmap | `$2000-$3F3F` |
| Screen colours, sprite pointers | `$0400-$07E7`, `$07F8-$07FF` |
| The 64 shared words (traits, money, years, flags) | `$7F40-$7FBF`, cleared by the top level before each start |
| The age in years | `$7F74`; the fraction of a year since the last birthday at `$7FC4`, in 65,536ths, which a save leaves out |
| The heap | from `$8466` up, its pointer at `$7FCB` |
| The p-code's stack | down from `$CFFF` |
| The drive's record buffer | `$8045-$8144`: a status, the file's number, then the 254-byte record |
| The map's and choices' pictures | `$E800` on (`$81F5` holds the address) |
| The scene strings | `$E000-$E5FB` (`$8463` holds the address) |

## The disk

Every MAP file is a relative file of 254-byte records, each a `:`, 252 bytes and a `:`. The game reads a file as one stream of its payload bytes, through a fast loader of its own (`$5B72-$5F2F`): it starts its code in the drive with `M-E $07AF`, then for each record sends `M-E $0300` with the record's number, and the drive clocks 256 bytes back over CIA 2 into the buffer at `$8045`. A file is numbered: MAP1 is file 1 (Infancy's stage, and the start and life objects), MAP27 file 2 (Childhood's and Old Age's stages), MAP3 to MAP6 files 3 to 6. When a read fails, the game asks for the disk it needs by number and label side (`prompt_retry_after_disk_error`, `$5677`, the table at `$7E6C`).

A saved life is a sequential file, AES0 to AES4, of 380 bytes: the regions of the shared words and the stage's state it moves through one routine (`$4E0F`). AESD, 160 bytes, is the directory of the five: five entries of 32 bytes, each the player's name and the age (`$4D86`). The fraction of the year at `$7FC4` is not saved, so a life resumed after a fresh start comes back at its last birthday (`parts/main/facts.md`, "Saving").

## Timing

The arrow's interrupt (`sprite0_motion_irq_hook`, `$4229`) runs in front of the KERNAL's own, on CIA 1's timer: 16,422 cycles apart, about 60 a second on a PAL machine. It moves the arrow four pixels across and three down or up towards its target each time, and puts sprite 0 back only once the raster has reached line 0 or 256. A busy loop of the game's (`$545B`) counts turns of 687 cycles.

## Chance

The game's dice are the SID's third voice running noise, read at `$D41B` (`read_sid_voice3_noise`, `$4697`): the questionnaire left to chance takes a bit of one for each answer (`$9323`), and scenes pick among their alternatives with them.

## The listing's error rate

The listing has 1,312 comments in its three parts.

A sample of 90 (seed 61106), drawn as 60 of the 916 written comments, 20 of the 204 the p-code decoder wrote and 10 of the 192 on text, was checked by a maintainer (`air`) on claude-fable-5-1 before any of them was changed. 18 were wrong, 20.0 % (95 % interval 13.0 % to 29.4 %), 19.4 % weighted by the strata's sizes: 14 of the 60 written, 4 of the 20 from the decoder and none of the 10 on text. What was wrong was a detail in each: a block size off by one (`$B1` for `$B0`), the number of header bytes a decoder template counted (two for three, in 13 records), a stack frame said to need an RTI that the bridge returns from itself, a key read called a wait for a key, a cleanup routine said to be tested for zero, opcodes said to share handlers, the KERNAL routine a save called (CHRIN for GETIN), a colour, and a scene cache's layout. All 18 were corrected, with the 95 other comments that said the same things: 113 in all.

The first of six audits, of the 248 comments of the resident program from `$0000` to `$57FF`, on claude-fable-5-1, found 8 wrong and 65 with a wrong detail, and corrected all 73: among them a routine named for a hit test that plays a click on the SID (now `play_sid_click`), one named for reading a pointer device that places the arrow at a text cell (now `place_arrow_at_text_cell`), the number of resident p-code procedures (62, not 82), and the values the three-digit formatter gets right (0 to 255 and 400 to 655).

## Live tests

Fifteen sessions in `port/test/lockstep.js`, each keys given at frames to the game's own code on the kit's C64 (`kit/c64/machine.js`, with the KERNAL and the drive of `port/src/kernal.js`), beside the JavaScript port, which agrees with it on memory and the chips at every call of GETIN:

| Session | What it plays | Frames |
|---|---|---|
| new-random | a new life, the name ADAM, the questionnaire left to chance, Infancy begun | 3,612 |
| infancy | then forty of Infancy's pages, an answer now and then | 35,981 |
| save | Infancy, then the RUN/STOP menu: saved in the first place, loaded, the status shown, quit | 17,705 |
| resume | the save session's disk: the life resumed from the start's menu, and played on | 27,727 |
| answers | the questionnaire answered by hand, then play | 29,155 |
| answers-edited | left to chance, then gone over by hand, then play | 33,694 |
| bot | 400 keys at random from a seed: fire, the cursor keys, the function keys, RUN/STOP | 95,102 |
| stage2 to stage7 | each phase from Childhood to Old Age chosen at the start, then 200 keys at random | 49,565 to 50,906 |
| arrow-keys | Adolescence with the keys marked with arrows in place of the shifted cursor keys | 48,591 |
| old-age | Old Age chosen at the start and played by 520 keys at random to the life's end, at 65; the stage's menu; a new life in Infancy played to the age of 1 | 115,881 |

The disks the game and the port leave are compared file by file at the end of each. `test_play.js` holds the published Play page to the game on three of the sessions, `test_levels.js` the Stages tab's maps to the game's own drawing, and `test_graphics.js` the Graphics tab's arrow and curtain to the game's code.
