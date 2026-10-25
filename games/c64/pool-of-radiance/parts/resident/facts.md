# The resident engine — verified technical facts

LINKER, LIBRARY and the fast loader FAST1.O, which BOOT loads and which
stay in memory from the title to the end, with the variables every
module shares. Every address here is the resident part's; another part's
routine is named with its part. Unless marked *live*, a fact comes from
the code in `phlan_party`. Live tests are listed in the game's own
`facts.md`.

## The loop and the files

- `linker` (`$2B80`) loads the module numbered at `$6E11` to `$0800`
  through `load_file` (`$2FC7`), asking for another disk side
  (`disk_prompt`, `$4378`) until the load succeeds, calls it, and loops.
  The modules' names and lengths are in the tables at `$2BBB`-`$2C07`.
- LIBRARY's jump table (`$2C48`) holds thirty JMPs the modules call at
  fixed places: printing, input, the menus, loading and storing a
  character, the combat figures.
- `load_resource` (`$4222`) makes sure a resource slot holds a file
  number: it writes the number in hexadecimal into the file's name
  (`resource_names`, `$40EB`) and loads it to the slot's address
  (`resource_dest`, `$41BE`), unless the slot already holds it.
- `fast_load` (`$B779`) takes the KERNAL's LOAD when the player kept the
  fast loader: it sends the file's name to the drive's own code and
  receives 256-byte blocks, timed to keep clear of the raster lines where
  the video chip steals cycles (`receive_block`, `$B85A`).

## Input and the screen

- `read_input` (`$2E4E`) takes one key from the keyboard buffer and reads
  the joystick in port 2; `menu_key` (`$306D`) turns either into a menu
  step.
- `print_string` (`$2D28`) prints at the cursor, wrapping at the text
  window's edge and scrolling it (`scroll_window`, `$2CA5`), with a delay
  after each character (`delay`, `$2E23`).
- `menu_bar` (`$3D53`) and `build_menu` (`$3CC3`) print the horizontal and
  vertical menus and record each item's place for the highlight, with a
  16-bit mask choosing which items show.
- `input_line` (`$2E81`) reads a typed line into `$9700`.

## Characters and items

- `load_character` (`$315A`) copies a character's two pages to `$6B00`
  and `$6C20`; `load_party_entry` (`$3189`) copies its 32-byte entry from
  the party table at `$8300` to `$6C00`.
- `compute_combat_stats` (`$3729`) builds the entry's combat figures
  from the character: damage dice, armour class, movement and to-hit.
  `weapon_bonuses` (`$368F`) adds the readied weapon's and the strength
  adjustments.
- `strength_index` (`$3ED2`) turns strength and its percentage into one
  index from 0 to 30: the score up to 17, and 18 plus one for each of the
  bands 1, 51, 76, 91 and 100 that an 18's percentage reaches.
- `max_load` (`$472E`) is 1500 coins' weight plus the strength allowance
  (`carry_allowance`, `$3AC1`, from nothing up to strength 11 to 15000).
  `armour_move` (`$3AFF`) sets a character's movement by its armour's
  weight: the base under 151, 9 from 151 to 399, 6 from 400, and a magical
  armour adds 3.
- `print_item_name` (`$399B`) prints an item as up to three of
  ITEMNAMES' words, its count first and a `*` when it is magical and
  identified.
- The VIEW screen (`view_menu`, `$4424`) and the items screen
  (`item_menu`, `$44CD`) call each module's own routines through vectors
  the module fills as it starts: the item actions at `$4611`-`$4620`,
  TRADE and DROP money at `$4471` and `$447B`, and the frame at `$48C8`.

## Variables

- The timed effects are a table of 64 at `$4900`: the kind, then whom it
  is on (`$4940`), then the time left (`$4980`), its top two bits the unit
  (minutes, ten-minute turns, hours, days). `find_entry` (`$3FE1`) searches
  it.
- The clock is at `$49C6`-`$49CB`, the year at `$49CC`, the days gone by
  at `$49EC`; the area's map number at `$49C5`.
- `random` (`$2D88`) is a lagged sum over `$03C2`-`$03C7`, each draw six
  rounds. BOOT seeds `$03C9`, a byte `random` does not use.
- `all_ram` (`$3AAB`) clears two bits of the processor port, from `$36` to
  `$30`, which shows RAM at `$A000`, `$D000` and `$E000` alike. *Live*.

## The interrupt

- `irq` (`$3BEA`), through the KERNAL's vector at `$0314`, plays a step of
  the sound driver (tables `$BA00`) and goes on to the KERNAL's own
  handler. It comes from CIA 1's timer, 60 times a second. *Live*.
