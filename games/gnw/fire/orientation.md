# Fire — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

MAME's ROM set `gnw_fire.zip`, made for an older MAME: it holds `fr-27`,
the Sharp SM5A's program, 1,856 bytes, CRC32 f4c53ef0 and SHA-1
6b57120a0f9d2fd4dcd65ad57a5f32def71d905f, which match MAME 0.289's
driver, and `gnw_fire.svg`, the screen, an older revision (163,753
bytes, CRC32 d546fa42, against the 163,920 bytes, CRC32 be8a9f05, that
MAME 0.289 expects; it draws 67 named segments). The program is the
chip's mask ROM; it is the unit's whole program, with no loader and
nothing in front of it. MAME's driver notes that the Elektronika clone
Kosmicheskiy Most (1989) has the same ROM.

`check-emulator` on the kit's machine passed 9 of 9 on 25 November 2026,
with nothing to work around.

## From power-on to play

1. Copy the zip into `work/` and start the kit's server
   (`python3 kit/scripts/tools.py gnw`).
2. Load it and name the buttons, from MAME's driver block for FR-27
   (`work/boot.py` does steps 2 to 4):

   ```python
   import sys, os; sys.path.insert(0, "kit/gnw")
   from gnw import connect
   m = connect()
   m.rom(os.path.abspath("games/gnw/fire/work/gnw_fire.zip"))
   m.wiring(buttons={"time": "R4.K1", "game_b": "R4.K2", "game_a": "R4.K3",
                     "alarm": "R4.K4", "right": "alpha", "left": "beta",
                     "test_k1": "R2.K1", "alarm_test": "R2.K4", "acl": "acl"}, low=[])
   ```

3. Power on lights every segment (mode 0). Run 2 s, press Time for
   0.2 s and run 1 s: the clock, with its demo. Save
   `m.save(os.path.abspath("games/gnw/fire/work/clock.gnw.json.gz"))`.
4. Press Game A for 0.3 s and let it go (the game starts when the key is
   released), run 3 s and save `work/play-gamea.gnw.json.gz`, at 106,496
   cycles from power on. The listing is built from it; it holds the ROM,
   which is all the listing reads from it, so the moment does not
   matter.

## Steady state

There is no interrupt. The chip runs a pass (pass, $0004): read the R4
row of buttons (read_keys, $0500) and the test pads (test_pads, $059D),
read left and right (read_pad, $03D6), and draw the screen when
something asked for it (draw_prep, $0600), keeping time and playing any
sound after the drawing (timekeep, $0200). In a game it then waits a
number of passes (wait, $0386) and runs one step (step, $0393): the
smoke, the chance of a jump, one of three parts of the path, and the
check for a catch. Out of a game, with nothing to draw, it sleeps with
CEND and wakes at $0000 on the next second or a button; in the clock
each second runs a step of the demo, which moves every part of the
path. Power on and ACL start at $03C0 (page $0F, step 0, power_on).

## The loader, in a paragraph

There is none. The program is in the chip; power on runs power_on.

## Files on the media

| File | Bytes | What it is | Where it lands |
|---|---|---|---|
| `fr-27` | 1,856 | the program | the ROM, $0000-$073F in the order the chip runs it |
| `gnw_fire.svg` | 163,753 | MAME's drawing of the screen, one shape a segment | not in the chip: the screen the kit's pages draw on |
