# The finale: facts

File F of Domark's disk. Every fact names the routine or table it
comes from, in this part's listing.

## Memory

| Range | What |
|---|---|
| `$0800`-`$0BBF` | fifteen sprite shapes, pointers `$20`-`$2E`: the black overlays of the animation |
| `$1000`-`$119F` | `show_ending`, the whole ending, straight-line code that never returns |
| `$2000`-`$3F3F` | the first picture, a hires bitmap: the shower seen through binoculars |
| `$5000`-`$5010` | `delay`, a busy-wait of about 0.35 s |
| `$6000`-`$7F3F` | the second picture, the same lenses cracked |
| `$8000`-`$80A0` | `finale_start`, `str_enter_code`, `read_code`, the typed characters and `secret_code` |

What lies between the pieces above is memory nothing in the part reads.
Some of it is in the file: `$11A0`-`$1FFF` and `$5011`-`$5FFF` match Paris's
code at the same addresses in 55 to 66 % of their bytes, with many bytes
differing in single bits (`$D059` where Paris has `$D019`). Whether that
is another build of Paris or damaged memory saved with the file is not
known.

The part has no interrupt handler of its own (the KERNAL's runs), no
sound, no joystick read and no character set.

## The code prompt

- `finale_start` (`$8000`) points the NMI vector `$0318` at `$8000`, blacks
  the screen and prints "PLEASE ENTER CODE" through the KERNAL's CHROUT.
- `read_code` (`$804C`) reads characters through CHRIN into `$8092` and
  compares the first five with `secret_code`, `ILVCT` at `$809C`
  (`$8061`-`$806E`). A match stores 1 in `$1BA0` and jumps to
  `show_ending`. RETURN before five characters stores 0 and goes back to
  the prompt. A wrong code prints RETURN, cursor-up and a space and reads
  again.
- *Live*, 8 October 2026: `ABCDE` and RETURN left the prompt waiting;
  `ILVCTX` and RETURN started the ending, since only five characters are
  compared.
- `$1BA0` is written (`$8072`, `$808C`) and never read in this part
  (`opcodes.py --refs $1BA0`).
- `read_code` is City Hall's `$1088` and the mine's `$5707`, byte for byte
  apart from the addresses it names. Only the early-RETURN target differs:
  here it is the prompt again, there it is the section's start.
- RESTORE runs the prompt again: the KERNAL's NMI entry `$FE43` is `SEI` and
  `JMP ($0318)` (KERNAL 901227-03). After the ending the prompt comes back
  over the cracked picture, because `finale_start` restores none of the
  video registers, so the code has to be typed blind (read in the code,
  not tried on this disk).

## The ending

`show_ending` (`$1000`):

1. fills both screen matrices (`$03E8`-`$07E7`, `$43E8`-`$47E7`) with `$0E`,
   black ink on light blue, and turns hires bitmap mode on with a light
   grey border and background;
2. shows the shower picture from `$2000` and plays eight sprite steps over
   it, each followed by `delay`: a man's head seen from behind, turning
   left in two frames (`$103E`, `$106E`, `$10BC`), a bar growing out of the
   small machine at the lower left (`$110A`), and a round object flying
   from the machine towards the head and growing to double size (`$1142`;
   the last step is sprite expansion, `$117B`-`$1180`, since shapes `$2D`
   and `$2E` have the same image);
3. selects VIC bank 1 (`$1186`-`$1195`) to show the cracked picture at
   `$6000`, turns the sprites off and ends in `JMP $119D`.

The whole ending takes about 2.8 s. Nothing prints a code, a score or a
message.

`delay` (`$5000`) counts 79 × 255 passes of a 17-cycle loop, about 343,000
cycles.
