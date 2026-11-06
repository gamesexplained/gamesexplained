# Alter Ego — the resident program: verified technical facts

The resident program: `$4000-$8465`, with the scene strings at `$E000-$E5FB` and the pictures of the map and the choices at `$E800-$F9CF`, read from the snapshot at the name prompt (`work/name-prompt.vsf`, `orientation.md`). How it is built, the interpreter's registers and the memory map are in the game's [`facts.md`](../../facts.md); this file has what is particular to this part. *Live* means seen in the recorded sessions (`../../facts.md`, "Live tests").

## The p-code

62 p-code procedures are resident (each begins `JSR $70F8`, counted in the snapshot from `$4000` to `$8465`); the rest of this part is 6502 code, the interpreter's handlers and its tables. The handler directory is the two 256-byte tables at `$7927` (low bytes) and `$7A27` (high bytes). Opcode `$B7` calls a 32-bit primitive by the number after it, through the table of words at `$7B42`; that table begins with the operand of the `JMP ($0002)` at `$7B41`, so number 0 would jump to `$0002`. Of the 90 p-code procedures in the three parts (`port/scripts/vm.py`), two use `$B7`, both in the life object, with numbers 18 and 24.

## The top level

`initialize_alter_ego_runtime` (`$4003`) clears the 64 shared words, puts in the vectors, the display and the arrow's interrupt (`initialize_display_and_sprite_irq`, `$43B3`), opens MAP1 and starts the heap. It then reads the three objects and runs the start and the life (the game's `facts.md`, "How the program is made"). It calls `$7FC8` to end, which holds the KERNAL's reset. *Live* (save, which quits).

## The display

The screen is a hires bitmap at `$2000` with its colours at `$0400`. Text is drawn into it a cell at a time:

- Letters and figures come from the character ROM: `copy_rom_glyph_to_screen_charset` (`$475D`) stops CIA 1's timer and clears CHAREN in `$01` while it copies eight bytes, then puts both back. The 91 characters `$20-$7A` it copies match the C64 character ROM 901225-01.
- The frame of a box, a block and a blank come from 16 glyphs of the game's own: a table of 16 pointers at `$48DB`/`$48EB` into the eight-byte patterns at `$48FB-$4962`, several of which share bytes. `copy_custom_glyph_to_screen_charset` (`$47B8`) copies one.
- Four tables give where a cell is: 40 columns at `8*i`, 40 columns of the packed panel at `31*i`, 25 screen rows at `$0400+40*i` and 25 bitmap rows at `$2000+320*i`.

`format_word_as_three_decimal_digits` (`$42D3`) writes three digits and a NUL. It takes 400 off once, then 200, 100, 80, 40, 20 and 10 from the low byte alone, so it is right only for 0 to 255 and 400 to 655.

## The arrow

`sprite0_motion_irq_hook` (`$4229`) is put in the KERNAL's interrupt vector (`$0314`), the KERNAL's own handler saved at `$4194` to be chained to. On each interrupt it moves sprite 0 four pixels across and three up or down towards its target, waits for the raster to read 0 (line 0 or 256), and only then writes the VIC's position registers. The Graphics tab's test runs this handler on the kit's C64 for 480 interrupts against the page's arrow.

## The curtain

`animate_screen_region_transition` (`$44C5`) brings a page on behind sprites 1 to 7, laid side by side and widened, as a bar that moves down the region row by row: the bitmap and colours behind the bar are swapped for the new page's, and when the last row is done every sprite is turned off. Its argument record gives the region, the source, a fill byte and a count of frames to wait at each step. The Graphics tab's test holds the page's curtain to this routine.

## The keyboard and the name

`EditMenuTextOrSelectEntry` (`$511C`) runs both the menus and the line the name is typed on. For the name the start object gives it the prompt at `$8E11`, the 16 bytes at `$82CB` and a length of 16. Letters are stored in lower case, DEL takes off the last, letters past the sixteenth are ignored, and RETURN accepts the line; a name of 16 letters has no NUL after it. *Live* (new-random types ADAM).

`delay_scaled_iterations` (`$545B`) is the game's only wait that is not for a key or the raster: it divides its count by 16 and counts that many turns of a loop.

`play_sid_click` (`$554D`) sets a voice's frequency, envelope and waveform and the volume, then gates the voice on and at once off: the click when fire chooses a line of a menu or a picture on the map, an octave lower when the picture has nothing to play.

## The disk

The fast loader is `$5B72-$5F2F` (the game's `facts.md`, "The disk"). `seek_map_payload_offset` (`$5C3D`) turns a byte offset in a file's payload into a record, dividing by 252, and a place in the buffer, the remainder plus 3 (past the status, the record's number and the `:`). `read_map_payload_bytes` (`$5CE6`) copies from the buffer and reads the next record when it reaches 255, so the `:` at each end of a record is never seen. `read_length_prefixed_stream_object` (`$4AEE`) reads an object from the stream: a word of its address, a word of its length and its bytes, growing the heap first when asked. When a read fails, `prompt_retry_after_disk_error` (`$5677`) asks for the disk by number and label side, from the two-byte table at `$7E6C` ("Please insert disk X, label side UP." or "DOWN."), and offers to try again.

## Saving

A saved life is five files, AES0 to AES4, and a directory, AESD:

- `transfer_save_slot_state` (`$4E0F`) moves 380 bytes, in this order: the shared words `$7F40-$7FBF` (128), `$81C5-$81F4` (48), `$81F7-$82AA` (180), the name `$82CB-$82DA` (16), the phase `$82BD` (2), `$82AB` (2) and `$7FC0-$7FC3` (4). The slot's digit is added to the name AES0.
- `format_save_directory_entry` (`$4D86`) makes the slot's line of the directory: four spaces, the 16 bytes of the name, ", Age " and the age in two columns.
- `read_save_directory_aesd` (`$4D05`) reads AESD's 160 bytes, five entries of 32, and `save_current_game_menu` (`$4F65`) and `resume_saved_game_menu` (`$4EF4`) show it as a menu of five. Saving writes AESD again, then the slot. *Live* (save, resume; the disks compared file by file).

The fraction of a year since the last birthday, `$7FC4-$7FC5`, is in none of the seven regions. On the kit's C64, the game alone: Infancy played from a new game until the fraction was `$4703`, LIFE TIME showing 0 years and 3 months; saved in the first place and quit; the machine started again and the life resumed from the title's menu, LIFE TIME showing 0 years and 0 months (`reference/months-before-saving.png`, `months-after-resuming.png`). Only `advance_age_and_finances` (life object, `$91CD`) writes it, so a life resumed without a fresh start, or born after Old Age, begins with the fraction the life before it left (the code, and the port's agreeing with the game's memory in the save, resume and old-age sessions).

## The heap

`AllocateVmHeapBlock` (`$6E70`) keeps a 16-bit pointer at `$7FCB`. It adds the size to it, wrapping at 64K, and refuses only an end above the p-code's stack less 256. Eight runs of the routine on its own, from the snapshot, show the guard exact to the byte, and a size large enough to wrap moving the pointer back or to zero; no part asks for one.

## Memory the program leaves alone

The loader leaves 4 KB at `$1000-$1FFF` and 32 bytes at `$FD30-$FD4F` under the KERNAL ROM. From the hand-over at `$4000` to the name prompt the game neither reads nor writes either (VICE load and store watchpoints); the life object later uses `$1000-$1FFF` as work space.
