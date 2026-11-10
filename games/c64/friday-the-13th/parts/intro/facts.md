# Friday the 13th, the introduction — verified technical facts

Current truth for TITLE, the first load, entered at `$2900`. Every fact names the routine or table
it comes from, read in `work/entry.vsf`.

## Memory layout

| Thing | Where |
|---|---|
| Program | `$2900`-`$2DDB` |
| Licence text, story text (PETSCII with colour codes, each ended by 0) | `$2A35`, `$2B68` |
| File name TITLE2 | `$2DD6` |
| Title picture: screen colours, colour RAM | `$2DDC`, `$31DC` |
| The scream, the same bytes as in the game | `$3600`-`$3F9F` |
| Title bitmap | `$4000`-`$5F3F` |
| Portraits bitmap, screen colours, colour RAM (moved to `$8800` at start) | `$5F40`, `$7E80`, `$8280` |
| End of the file | `$8781` |

## Sequence

`intro_start` (`$2900`): black border and background, BASIC out, screen cleared; `copy_pages`
(`$29BE`) moves 40 pages from `$5F40` to `$8800`; `show_title` (`$293E`) and `show_bitmap`
(`$295C`) show the title in video bank 1 (bitmap `$4000`, screen `$7C00`); `play_scream`
(`$3600`); `show_text_screen` (`$29D4`) copies the ROM font to `$6000`, points the KERNAL's screen
at `$7C00` and prints the licence; `wait_key` (`$2D9B`); `print_story` (`$2A1C`); `wait_key`;
`show_portraits` (`$2989`) copies 32 pages back from `$8800` and the colours from `$A740` and
`$AB40`, background 11; `wait_key`; `load_title2` (`$2DA8`) loads TITLE2 with SETLFS 8,8,8, SETNAM
and LOAD; then the jump to `$0900`.

## Controls

`wait_key` waits for no key (`$C5` = `$40`), then for any key, so a key held from the screen before
does not count.

## Sound

The scream only: `play_scream` at `$3600`, the same routine and sample as the game's. The
introduction plays no music.
