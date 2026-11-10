---
name: gnw-reference
description: Nintendo Game & Watch facts for reverse engineering, the Sharp SM5A microcontroller of the early units, its program counter that steps through each page in a shift register's order, the program and data memories, every instruction, jumps, calls and the one-level stack, the divider and the 1 Hz flag, sleep and wake-up, the buttons, the buzzer and the LCD's latches, and the mistakes that bite. Consult this instead of recalling from training.
---

# Game & Watch reference for reverse engineering

Consult this file. If a fact you need is not here, say so in the game's
`kit-feedback.md` and derive it from the emulator, not from memory.

The profile is the machine the kit runs: a Game & Watch built on the
**Sharp SM5A**, as MAME 0.289 emulates it. MAME's list of units
(`src/mame/handheld/hh_sm510.cpp`, "Game list") gives it to the 15 units
from AC-01 to FR-27: the Silver and Gold series and the first Wide Screen
ones. The later units use the SM510, SM511 or SM512, whose instruction
sets differ; this file does not cover them, and a run on one says so in
`kit-feedback.md` before going on.

Each fact says where it comes from: MAME 0.289's source, under
`tools/gnw/mame-src` once `tools.py get-mame` has fetched it ("MAME,
`devices/cpu/sm510/sm5a.cpp`", paths under `src/`); or the kit's machine
itself ("live", with the date). Sharp's data sheet for the SM5A is not
public; MAME's authors worked from the SM500's and SM510's and from
decapped chips, and MAME's own notes mark what is a guess (`sm500.cpp`,
"TODO"). Where this file repeats one, it says so.

## Where to read about a game first

- **MAME's driver**, `src/mame/handheld/hh_sm510.cpp`: one block per
  unit, with its model number (the code on the back, two letters and a
  number), the chip's label, the screen's size, the buttons and which K
  and R pins they are on, and the ROM's size and checksum. Find it with
  `grep -n '<model number>' src/mame/handheld/hh_sm510.cpp`. The comment
  above the list of units says which units MAME has a cheat for (a test
  pad on the board) and which quirks are the real unit's.
- **The ROM set** is two files: the program, the chip's mask ROM read
  out of the decapped chip (1,856 bytes on an SM5A), and an SVG of the
  screen, one named shape per segment, drawn from photographs of the
  LCD. Only the program is the game's code. The SVG's revision changes
  between MAME versions; a set made for another version runs with a
  warning about its length and checksum, and draws the same segments.

## The chip

- A 4-bit microcontroller: the accumulator **A**, a carry flag **C**,
  the data pointer **B** (BM, 3 bits, and BL, 4 bits), a one-level
  stack, the program counter, and the latches that drive the LCD. It
  has no interrupt: it sleeps and wakes (below).
- The clock is a 32.768 kHz watch crystal. An instruction takes one
  machine cycle of two clocks, 61 microseconds; LBL and the `5E`
  prefix, two bytes, take two cycles (MAME, `devices/cpu/sm510/sm510base.h`,
  `execute_clocks_to_cycles`, and `sm510base.cpp`, `execute_run`). So the
  chip runs 16,384 instructions a second at most, and a game's speed is
  counted in instructions, not in frames: nothing on the machine has a
  frame.

## The program counter and the order of the program

- The program counter is 11 bits: **CB** (1 bit), the page **PM** (4
  bits) and the step **PL** (6 bits). CB and PM together name one of
  32 pages of 64 bytes.
- **PL does not count up.** It is a 6-bit shift register: each step
  shifts it right and feeds in a 1 at the top when bits 0 and 1 are equal
  (MAME, `sm510base.cpp`, `increment_pc`). From 0 it runs 0, $20, $30,
  $38, $3C, $3E, $1F, $2F, ... through 63 values and back to 0. It never
  carries into the page: **the instruction after the last step of a page
  is the first step of the same page.** $3F is outside the sequence: a
  jump to step $3F stays there for ever.
- The kit lists the program in that order. A byte's **logical address**
  is its page times 64 plus its place in the sequence;
  `kit/cpu/sm5a.py` converts (`logical`, `physical`) and the snapshot
  holds the ROM in logical order. So the listing's addresses are not the
  ROM's, and a line's place in the ROM is the `pc` the listing names
  beside it. MAME's debugger writes an address as `CB:PM:PL`, the
  physical one: `0:F:00` is page $0F, step 0.
- **The ROM** is $000-$73F, 29 pages; pages $1D-$1F repeat page $1C
  (MAME, `sm5a.cpp`, `program_1_8k`).
- **Reset** (power on, and the ACL button) goes to page $0F, step 0, with
  CB 0 (`sm500.h`, `reset_vector`). It also sets R to $F, so every R
  output is low: the buzzer is quiet and no row of buttons is selected.
  It turns the LCD on (BP = 1) and sets the 1 Hz flag (`sm500.cpp`,
  `device_reset`).

## Jumps and calls

- **TR x** ($80-$BF) jumps to step x of the page in the stack's top
  bits, **SU**, with CB: the page the last `SSR` set, or the page the
  last call returned to (`sm500op.cpp`, `op_tr`). In code that keeps SU
  on its own page, as code does that never uses `SSR`, that is a jump
  within the page. Inside a subroutine (after `TRS`, until `RTN`), `TR`
  is a jump within the current page whatever SU holds.
- **SSR n** ($70-$7F) sets SU to n, and makes the next `TRS` a long
  call.
- **TRS x** ($C0-$FF), outside a subroutine, pushes the return address
  and calls step x&$3F of page $10 (CB 1, page 0: the ROM's $400-$43F;
  `sm5a.h`, `get_trs_field`). Page $10 is the chip's table of subroutine
  entries, each a `TR` on to the routine. After `SSR n`, `TRS` calls
  page n, with CB, at step x&$3F. Inside a subroutine, `TRS x` is a jump
  to the same four-page group, page bits from x's bits 4-5, step x&$0F
  (`op_trs`). There is one level of stack: a subroutine cannot call
  another.
- **RTN** returns, and **RTNS** returns and skips the instruction after
  the call. Both end the subroutine.
- **COMCB** flips CB, which the next jump uses: it is how code reaches
  pages $10-$1C.
- The listing shows `TR` going to its own page, or to the page an `SSR`
  just before it names, and `TRS` to page $10, or to the page an `SSR`
  just before it names (`kit/cpu/sm5a.py`, `target`). A `TRS` on page
  $10 itself is shown as the jump it is, since the call table runs only
  inside a subroutine. The listing cannot see CB, an `SSR` further back,
  or that other code runs inside a subroutine: a `TRS` in a routine
  reached by a call is a jump, and the listing names a page $10 entry
  instead. Where any of these decides the target, check it live (the
  server's checkpoints, or `hooks` on `kit/gnw/sm5a.js`), and comment
  the line.

## Skips

Most tests skip the next instruction rather than branch: the chip runs
it as `SKIP` (no operation). A 2-byte instruction is skipped whole.
`LAX` after `LAX` is skipped too: in a run of `LAX`, only the first
loads A (`sm510op.cpp`, `op_lax`), so a jump into the middle of the run
loads a different value; that is how a table of values is written.

## The data memory

- 4-bit cells, addressed by B: BM (the row) and BL (the column). Rows
  0-4 each have 13 cells, columns 0-12. Columns 13-15 of a row read and
  write column 12; rows 5, 6 and 7 are row 4 again (MAME, `sm5a.cpp`,
  `data_5x13x4`, `mirror_r`). So the chip has 65 cells.
- The snapshot keeps cell n (BM * 16 + BL) at $1000 + n, one byte each,
  mirrors included, so a listing's operand can name it.
- `LB x` sets BM to x&3 and BL to bits 2-3 of x, with bit 3 also set if
  either is (`sm500op.cpp`, `op_lb`): LB reaches columns 0 and 8-11 only.
  `LBL xy` sets B from its second byte. `SBM` and `RBM` set and clear
  BM's bit 2, which `LB` clears.
- `EXC`, `EXCI`, `EXCD` and `LDA` take a 2-bit n and XOR it into BM after
  the access: one instruction reads a cell and moves B to another row.
  `INCB` and `EXCI` skip when BL becomes 8 (`sm500op.cpp`, `op_incb`),
  not 16: a loop over columns 0-7. `DECB` and `EXCD` skip when BL wraps
  from 0 to 15.
- Nothing clears the memory at power on: MAME starts it at zero. A game
  that reads a cell before it writes it reads what the chip held.

## Arithmetic

- `ADD` adds M to A and leaves C. `ADDC` adds M and C, sets C from the
  carry, and skips on a carry. `ADX x` adds x and skips on a carry,
  except `ADX 10`, which never skips (`sm510op.cpp`, `op_adx`): 10 is
  the decimal adjust, A + 10 being A - 6 in four bits.
- `COMA` complements A. `RC` and `SC` clear and set C; `TC` skips when C
  is clear.

## Time: the divider and the 1 Hz flag

- A 15-bit divider counts the crystal, 32,768 a second. When it wraps,
  once a second, it sets the **1 Hz flag** (gamma; `sm510base.cpp`,
  `div_timer_cb`). `TG` skips when the flag is clear, and clears it:
  the clock's seconds. `IDIV` clears the divider's low 9 bits (on the
  SM5A; `sm500op.cpp`), and `DTA` reads its bits 11-14 into A, a value
  that steps 16 times a second, which a game uses as a timer or a
  random number.
- **CEND** stops the clock: the chip sleeps until a button is pressed
  (any K input of a selected row) or the 1 Hz flag is set, then wakes at
  page 0, step 0, with CB 0 (`sm500.h`, `wakeup_vector`). A watch's
  idle loop is `CEND` once a second. B and the stack are left as they
  were, though Sharp's documents say they are undefined after waking.

## The buttons

- **K1-K4**, read by `KTA` into A, are the buttons of the rows the R
  pins select. The R outputs are the complement of what `ATR` writes:
  R1 is the buzzer, and R2, R3 and R4 each select a row of buttons when
  their bit of A is 0 (`sm500.cpp`, `clock_melody`; MAME's driver,
  `hh_sm510.cpp`, `piezo_input_w`). Which button is which K and R is in
  the unit's driver block.
- A unit may wire its last row to ground instead of to an R pin: that
  row is read by every `KTA`, whatever R selects. MAME marks such a unit
  with `inp_fixed_last()` in its class; a game on one reads its buttons
  with R left at $F.
- **Alpha** and **beta** are wired active high on some units and active
  low on others (`IP_ACTIVE_HIGH` or `IP_ACTIVE_LOW` in the unit's
  ports): read the driver before taking a skip as "pressed".
- **Alpha** and **beta**, two inputs of their own, are usually the left
  and right controls: `TA` skips when alpha is high, `TB` when beta is.
  A unit's driver block names them (`BA` for alpha, `B` for beta).
- **ACL** is the reset button, wired to the chip's reset.
- A row a unit never wires, or wires to a test pad, can still be read: it
  is how the units' hidden cheats work.

## The buzzer

R1 drives the piezo directly on the SM5A (`set_r_mask_option(RMASK_DIRECT)`):
a tone is the program toggling R1 with `ATR` in a timed loop, so its pitch
is a count of instructions. Nothing else makes sound.

## The LCD

- Each segment of the screen is one bit of an output latch. The SM5A
  has nine 4-bit latches **W** for one common, H1, and nine **W'** for
  the other, H2, so up to 72 segments (`sm500.h`, `m_o`, `m_ox`; a unit
  may use fewer).
- `WR` and `WS` shift A into W' (the latches move along by one, the new
  value going into the last), with bit 3 cleared or set. `DTW` and
  `PDTW` shift in a digit's segments from the chip's built-in table of
  the digits 0-9, and `TW` and `PTW` copy W' into W (all nine, or the
  last two). So a game draws by building W' and copying it, a row at a
  time.
- **BP** bit 0, set by `ATBP`, turns the whole screen on and off; bit 3
  (`COMCN` flips it) picks which half of the digit table `DTW` reads
  (`sm500op.cpp`, `get_digit`).
- MAME's SVG of a unit's screen gives each segment's shape a title
  `o.b.h`: latch o (0-8), bit b (0-3), common h (0 for W and H1, 1 for
  W' and H2; `hh_sm510.cpp`, `update_display`). The kit's `lit()` and the
  server's `screen` use the same names. Which shape is which object on
  the screen is the game's to find, by lighting one bit at a time.

## Mistakes that bite

- **Reading the ROM in order.** Bytes next to each other in the ROM
  file are not run one after the other. Use the snapshot's logical
  order, or MAME's debugger, which steps the same way.
- **Taking a TR as a jump within the page.** It goes to SU's page,
  which only usually is its own.
- **A subroutine calling another.** It cannot: `TRS` inside a
  subroutine is a jump, and the return address is still the first
  caller's.
- **INCB counting to 16.** It skips at 8.
- **A skip helper read the wrong way round.** `TM n` skips when bit n is
  set, so a helper `TM n`, `RTNS`, `RTN` returns with a skip when the bit
  is *clear*, and `TM n`, `RTN`, `RTNS` when it is set; `TC` skips when C
  is clear. Run each helper once with the bit set and once clear on
  `kit/gnw/sm5a.js` before naming it: a name the wrong way round inverts
  every reading built on it, and reads as right.
- **Looking for an interrupt or a frame.** There are none. The game's
  speed is the instructions its loops run, and its clock is the 1 Hz
  flag. A routine's cost is counted in instructions, and so is a delay.
