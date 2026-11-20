# Parachute — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

MAME's ROM set `gnw_pchute.zip`, made for an older MAME: it holds
`pr-21`, the Sharp SM5A's program, 1,856 bytes, CRC32 392b545e and SHA-1
e71940cd4cee07ba1e62c1c7d9e9b19410e7232d, which match MAME 0.289's
driver, and `gnw_pchute.svg`, the screen, an older revision (169,486
bytes, CRC32 bf86e0f9, against the 169,640 bytes, CRC32 f30a0b31, that
MAME 0.289 expects; it draws 71 named segments). The program is the
chip's mask ROM; it is the unit's whole program, with no loader and
nothing in front of it.

`check-emulator` on the kit's machine passed 9 of 9 on 19 November 2026,
with nothing to work around.

## From power-on to play

1. Copy the zip into `work/` and start the kit's server
   (`python3 kit/scripts/tools.py gnw`).
2. Load it and name the buttons, from MAME's driver block for PR-21:

   ```python
   import sys, os; sys.path.insert(0, "kit/gnw")
   from gnw import connect
   m = connect()
   m.rom(os.path.abspath("games/gnw/parachute/work/gnw_pchute.zip"))
   m.wiring(buttons={"time": "R4.K1", "game_b": "R4.K2", "game_a": "R4.K3",
                     "alarm": "R4.K4", "right": "alpha", "left": "beta",
                     "test_k1": "R3.K1", "alarm_test": "R3.K4", "acl": "acl"}, low=[])
   ```

3. Power on lights every segment (mode 0). Run 2 s, press Time for
   0.2 s and run 1 s: the clock, with its demo. Save
   `m.save(os.path.abspath("games/gnw/parachute/work/clock.gnw.json.gz"))`.
4. Press Game A for 0.3 s and let it go (the game starts when the key is
   released), run 3 s and save `work/play-gamea.gnw.json.gz`, at 106,496
   cycles from power on. The listing is built from it; it holds the ROM,
   which is all the listing reads from it, so the moment does not
   matter.

## Steady state

There is no interrupt. The chip runs a pass (pass, $0004): keep time on
the 1 Hz flag and play any sound, read the R4 row of buttons (read_keys,
$0506), read left and right (read_pad, $0380), and draw the screen when
something asked for it (draw_prep, $0600). In a game it then waits a
number of passes (wait, $0046) and runs one step (step, $0053): the
helicopter's rotor turns, one of the three lanes moves, the catches and
misses are seen to, the water's chain moves, and points are added. Out
of a game, with nothing to draw, it sleeps with CEND and wakes at $0000
on the next second or a button; in the clock each second runs a step of
the demo, which moves all three lanes. Power on and ACL start at $03C0
(page $0F, step 0, power_on).

## The loader, in a paragraph

There is none. The program is in the chip; power on runs power_on.

## Files on the media

| File | Bytes | What it is | Where it lands |
|---|---|---|---|
| `pr-21` | 1,856 | the program | the ROM, $0000-$073F in the order the chip runs it |
| `gnw_pchute.svg` | 169,486 | MAME's drawing of the screen, one shape a segment | not in the chip: the screen the kit's pages draw on |
