# Mike Read's Computer Pop Quiz — orientation

How to get from the contributor's own copy to the analysed state.

## The image

`work/Pop_Quiz.tap`, 1,530,784 bytes, SHA-256 `791efce1b4a875a4f4794e8bffdedcf56cdd987bfdee81345ae165fe480b9a1c`: a TAP of the original Elite cassette of 1988, entry 977 of the Ultimate Tape Archive V4.0, with scans of the inlay and the cassette and the archive's index (`.idx`), which names the stretches "Mike Read's Pop Quiz" and "Block 1" to "Block 5".

`python3 kit/c64/tap.py work/Pop_Quiz.tap` reads one file in the KERNAL's format, `POP QUIZ` (a 512-byte boot program at `$02A7`), and 799 seconds of pulses in a format it does not decode, 312 and 712 cycles long. The boot program is Novaload ("(C)1984 NOVALOAD" in its last bytes). `work/novaload.py` reads that stretch as the loader reads it, and finds 26 files, every checksum right:

| # | Name | Loads at | Bytes | Part | Role |
|---|---|---|---|---|---|
| 0 | `NOVA` | `$4000` | 239 | — | second stage: loads files 1 to 5 by name |
| 1 | `0` | `$1000`-`$3F3F` | 12,096 | — | the loading picture |
| 2 | `3` | `$4200`-`$CFFF` | 36,352 | title | the program |
| 3 | `4` | `$E000`-`$FF4A` | 8,011 | title | the program, in the RAM under the KERNAL |
| 4 | `1` | `$2400`-`$2BFF` | 2,048 | title | the program |
| 5 | `2` | `$0C00`-`$3FFF` | 13,312 | title | the program; it loads over the second stage, and the game starts at the return |
| 6, 10, 14, 18, 22 | `FX` | `$4F00`-`$53FF` | 1,280 | quiz | sound effects code, the same five times |
| 7, 11, 15, 19, 23 | `A`, `D`, `G`, `J`, `M` | `$E000`-`$EFFF` | 4,096 | quiz | question block 1 to 5, its first file; the game copies it to `$D000` |
| 8, 12, 16, 20, 24 | `B`, `E`, `H`, `K`, `N` | `$B800`-`$CFFF` | 6,144 | quiz | the block's header and questions |
| 9, 13, 17, 21, 25 | `C`, `F`, `I`, `L`, `O` | `$E000`-`$FEFF` | 7,936 | quiz | the block's pictures and the other rounds' text |

**Version.** The title picture says "Elite"; nothing on the tape names a release beyond the year.

**Emulator.** VICE release v3.13.2 (vice-mcp commit `1e83aab134`) under WSL Ubuntu on Windows 11; `check-emulator` passed 57 of 57 on 13 November 2026, so no workaround applies.

## From power-on to play

1. `python3 kit/scripts/tools.py vice`, then a hard reset and `vice.autostart(rpc, "games/c64/mike-reads-computer-pop-quiz/work/Pop_Quiz.tap")` with warp on (`work/handover.py` does it). The KERNAL loads `POP QUIZ`, which loads the loading picture and the program through the LOAD vector at `$0330`; the game starts 309 seconds after the autostart, in warp.
2. `work/entry.vsf` (also `parts/title/work/entry.vsf`): the machine stopped at `$40E2`, where the last load returns into the game's own bytes (`LDA #$1B`, `STA $D011`, `JMP $0400`).
3. The menu, "Select game options", offers a one-player or a two-player game. Player one uses joystick port 1 (or the keyboard), player two port 2 (`$1C9C`); fire, or SPACE for player one, chooses. Hold fire for a second and a half: the game samples the stick only now and then. SPACE chooses One Player Game; player one and the computer then pick a specialist subject from six icons (SPACE stops the cycling highlight), player one a team captain and two team members from twelve faces (the stick moves the cursor, held fire chooses). `work/teams.vsf` (`parts/title/work/play-teams.vsf`) is the team introduction.
4. Mike Read introduces the teams and the game offers "Question block 1" to "Question block 5": the stick and fire choose one, and the game loads its four files from the tape (`FX`, then the block's three). In VICE a snapshot does not keep the tape's place, so `work/fastload.py` serves each load from the decoded files instead: it stops at `$033C`, Novaload's entry, writes the file the game asked for, and continues at `$03AF`, where the loader ends a load (`BLOCK=n` serves block n whichever the game asked for). `work/block1-loaded.vsf` to `work/block5-loaded.vsf` are the game with each block in memory, 50 seconds after its choice; `block1-loaded.vsf` is `parts/quiz/work/entry.vsf`.
5. The first round then asks player one to choose a number from 1 to 12; `work/q1b.vsf` (`parts/quiz/work/play-round1.vsf`) is that moment.

## The parts

The program loads whole at the start, and the menu, the subjects and the teams run on it (part `title`). Choosing a question block loads the sound effects code over `$4F00`-`$53FF` and the block's files over `$B800`-`$FEFF`, where part of the menu's code was (part `quiz`, `over` title). The five blocks are data of one layout loaded into the same buffers, so they are not parts of their own: the listing shows block 1, and the questions page reads all five.

## Steady state

At the hand-over `$01` is `$27`; the game sets `$35` (I/O in, both ROMs out) for play, and runs code in the RAM under the KERNAL. The IRQ vector at `$FFFE` is `$0403`. The menu's code runs at `$E000` and above until a question block replaces it.

## The loader, in a paragraph

Novaload's boot program sets the LOAD vector at `$0330` to its own routine at `$033C`, loads its second stage and calls it at `$4000`; the code after the call, which would put `RUN:` into the keyboard buffer, is never reached, because the game takes over before the call returns. Each load starts CIA 1's timer A from `$81F4` at every pulse and reads its high byte at the next, so a pulse longer than 500 cycles is a 1; bytes come lowest bit first. A file is a run of 0 bits, a 1, the byte `$AA`, the name's length and the name (compared with the one asked for), six header bytes (the load address, with the page one before the first; the end address; the bytes of the last page; the number of pages), then each page with a running checksum before it (`work/novaload.py`). The second stage loads files `0`, `3`, `4`, `1` and `2` through the KERNAL's LOAD; file `2` loads over the stage itself, and the KERNAL's return lands in the game. During play the game loads each question block the same way.
