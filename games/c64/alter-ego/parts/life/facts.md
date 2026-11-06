# Alter Ego — a life: verified technical facts

The life object: `$8466-$CC69`, read from MAP1 over the start object and called through the same entry, `JMP $B392`. Addresses are this part's and link into its listing, which is read from the snapshot as Infancy begins (`work/infancy.vsf`). *Live* means seen in the recorded sessions (`../../facts.md`, "Live tests"), the port agreeing with the game's code on memory and the chips at every call of GETIN.

## Entering and leaving

`gameplay_object_entry_setjmp` (`$B392`) keeps the p-code's frame at `$C29A` and goes to `play_life_stage` (`$84DC`), which never returns to it. `gameplay_object_longjmp_exit` (`$B3B5`) goes back to the top level from any depth through that frame, with a value: 1 when the player quits, which the top level ends in the KERNAL's reset. *Live* (save).

## A stage's file

`open_stage_map_stream` (`$881B`) opens the stage's MAP file through the resident fast loader: file 1 (MAP1) for Infancy, file 2 (MAP27) for both Childhood and Old Age, files 3 to 6 for the rest. Files 1 and 2 begin with a four-byte offset: Infancy's and Old Age's stages seek to it, past what comes before them in the file, and Childhood's reads it and starts where it is. *Live* (stage2, stage7).

`load_stage_header` (`$88A9`) then reads the stage's header:

| What | Where it goes |
|---|---|
| eight bytes of the stage's clock, the first age first | `$803B-$8042` |
| the eight choices beside the map, 48 bytes | `$81C5` |
| the count of the map's words, and the map, three words to an age | `$82BB`, `$81F7` |
| the cell the arrow starts on | `$82DB` |
| the count of the scene blocks, and each block's length | `$82F5`, `$82FB` |

Where the blocks start in the file goes to `$82F7`. A stage begun has its number stored negative at `$82BD`, so that the header is read in full; a stage resumed from a save keeps the choices and the map it saved.

## The map

`play_life_stage` (`$84DC`) sets the border to the stage's colour from the seven bytes at `$CAA4` (red, orange, yellow, green, light blue, purple, grey), draws the window of the map and puts the arrow on it. Up and down move a row, scrolling the window at its edges; left and right move over the age's three cells and the two columns of choices beside them. Fire plays the cell or the choice under the arrow, the function keys a choice beside the map (f1, f3, f5 and f7 the left column's from the top down, f2, f4, f6 and f8 the right's; `read_normalized_input` turns them into 3 to 0 and 7 to 4, and the choice under the arrow is its row counted up from the window's foot), and RUN/STOP opens the menu at `$CAB1`: continue, save, resume, quit, or the status. *Live* (bot, stage2 to stage7, arrow-keys).

A cell's word gives its scene block in its low byte and its kind in bits 8 to 11; a cell played has its kind cleared, crossing it off. A choice's word gives its type the same way: 1 shows the age in years and months (`show_lifetime_status_screen`, `$AA90`), 5 the whole status (`render_complete_life_status`, `$ADAC`), and the others play the choice's next experience (`activate_stage_choice`, `$87C5`).

## A cell played

`play_life_map_cell` (`$8A85`) clicks, copies the 64 shared words to `$8145`, finds the block's place in the file by adding up the lengths of the blocks before it (`locate_scene_block`, `$982A`) and plays it (`execute_scene_chunk_chain`, `$9B18`). What the scenes return decides what follows:

| Value | What follows |
|---|---|
| 255, 254, `$FFFF` | the cell is crossed off |
| `$FFFE` | the block could not be read: the words are put back and the cell crossed off, but a cell of kind 8 has its chain played again until it can be |
| 251 | the scene does not count: the words are put back |
| 252 | a choice's next experience is played |
| `$FFFD` | a panel of three lines: the experience is inappropriate for you at this time (`show_three_line_message_panel`, `$ABA9`) |
| 250 | the stage is over |
| 253 | the life is over: the stage is set to 7, then ended |

Then the block's length, or a third of it for a choice, moves the years and the money on (`advance_age_and_finances`, `$91CD`). When the age has passed the stage's last (`$803D`) or no cell is left, the block of the choice of type 5 plays as the stage's last scene, and the stage ends.

## Scenes

A scene block is a chain of descriptors, each played by `interpret_interaction_descriptor` (`$9BF9`): conditions on the shared words (five bytes each, a word's number and two signed big-endian bounds, `$FF` between phases of them, `evaluate_scene_conditions`, `$9B96`), effects on the words of four bytes each, choices, a script of what to show, and text. Chance comes from the SID's noise (`read_sid_voice3_noise`, in the resident program). *Live* (infancy, bot, every stage session; the sessions hand the game and the port the same noise from a seed, since the kit's C64 reads the SID's noise as 0).

The text is packed with LZW in groups: eight codes to a group, of 9 bits each and then of 10, the dictionary growing to 1,024 entries (`decompress_grouped_lzw_slice`, `$A4F7`; codes read by `$A850` and `$A974`). The prefixes are kept at `$B57B-$BD7A` and the suffixes at `$BD7B-$C17A`, and each piece of a block is decoded into `$C2A2` (`load_local_map_chunk`, `$9A14`). An independent decoder of the contributor's reads scene 26 of MAP1 to the same 7,872 bytes and the same dictionary, and the port's decoder runs in every session. `render_scene_text_with_substitutions` (`$A279`) draws it, putting names and words in its gaps; it switches the KERNAL ROM out to read the scene strings under it at `$E000`.

## The years and the money

`advance_age_and_finances` (`$91CD`) moves the age (`$7F74`, with the fraction of a year at `$7FC4`) by the block's length. A job's salary (`$7F8A`) pays for the years, less a tax worked from `$7F52` and the stages left (`$8041`); with no job (`$7F58` zero) the salary is cleared and, from the third stage on (`$8041`, the stages left counting this one, at 5 or less), the cost of living is taken instead (`$9472`). The cash and the debt are kept as thousands and units (`$7F78`/`$7F76`, `$7F84`/`$7F82`), worked in 32 bits and divided back by 1,000 (`$9730`). An acquisition waiting at `$7F88` becomes its bit in `$82AB`. *Live* (every stage session).

## The status

`show_lifetime_status_screen` (`$AA90`) shows YEARS and MONTHS. `render_complete_life_status` (`$ADAC`) shows the name, the years, the work, the relationships, the cash and the debt, the traits, each a bar of the resident glyphs (`draw_trait_score_bar`, `$B1EB`), and what has been acquired. *Live* (bot, save).

## The end of a stage, and of a life

`finish_life_stage` (`$8CFF`) wipes the text panel, closes the stage's file and shows the menu at `$CAB1` ("Do you wish to:" continue, save the game, resume a game, quit, or show the status and ask again) until the answer is not the status. Then the next stage:

- After stages 1 to 6, the debt is paid in part: its share for the stages left (`$7F84` divided by `$8041`) is taken from the cash, or all the cash when the share is more, and the debt's units are cleared.
- After the seventh, a new life begins in Infancy. The 88 bytes from `$7F58` (shared words 12 to 55) are cleared, the acquisitions (`$82AB`) are gone and the four bytes at `$7FC0` become `00 00 70 2A`. The twelve traits and the name are kept.

The new stage's number is stored negative, so that its header is read in full, and the menu's answer is acted on.

In the game's own code alone on the kit's C64, Old Age begun at the start and played by keys at random from seed 7 ended at the age of 70, at frame 90,991: the life's last scene, then the menu. The keys took SAVE GAME and then Cancel, and a new life's first page followed, "You are in a warm, dark, comfortable place", the stage already set to 1 whatever the answer (`reference/old-age-last-scene.png`, `stage-over-menu.png`, `new-life-womb.png`).

## Arithmetic

The life object has 16-bit multiplication, division and shifts of its own, and a 32-bit arithmetic shift right (`$B408-$B567`). `DivideSigned16InPlace` (`$B46B`) and its three siblings share one restoring-division loop; a divisor of 0 gives a quotient of `$FFFF` (1 from the signed divide when the dividend is negative) and leaves the dividend as the remainder, which 44 runs of the routines on their own show.
