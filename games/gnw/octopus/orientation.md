# Octopus — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

MAME's ROM set `gnw_octopus.zip`, made for an older MAME: it holds
`oc-22`, the Sharp SM5A's program, 1,856 bytes, CRC32 bd27781d and SHA-1
07b4feb9265c83b159f96c7e8ee1c61a2cc17dc5, which match MAME 0.289's
driver, and `gnw_octopus.svg`, the screen, an older revision (119,681
bytes, CRC32 39900430, against the 119,827 bytes, CRC32 efbdaa65, that
MAME 0.289 expects; it draws 70 named segments). The program is the
chip's mask ROM; it is the unit's whole program, with no loader and
nothing in front of it. MAME's driver notes that the Elektronika clone
Тайны океана (`taynyoke`) has the same ROM.

`check-emulator` on the kit's machine passed 9 of 9 on 12 November 2026,
with nothing to work around.

## From power-on to play

1. Copy the zip into `work/` and start the kit's server
   (`python3 kit/scripts/tools.py gnw`).
2. Load it and name the buttons, from MAME's driver block for OC-22:

   ```python
   import sys, os; sys.path.insert(0, "kit/gnw")
   from gnw import connect
   m = connect()
   m.rom(os.path.abspath("games/gnw/octopus/work/gnw_octopus.zip"))
   m.wiring(buttons={"time": "R4.K1", "game_b": "R4.K2", "game_a": "R4.K3",
                     "alarm": "R4.K4", "right": "alpha", "left": "beta",
                     "cheat": "R2.K1", "acl": "acl"}, low=[])
   ```

3. Power on lights every segment (mode 0). Run 2 s, press Time for
   0.2 s and run 1 s: the clock, with its demo. Save
   `m.save(os.path.abspath("games/gnw/octopus/work/clock.gnw.json.gz"))`.
4. Press Game A for 0.3 s and let it go (the game starts when the key is
   released), run 3 s and save
   `work/play-gamea.gnw.json.gz`, at 106,496 cycles from power on. The
   listing is built from it; it holds the ROM, which is all the listing
   reads from it, so the moment does not matter.

## Steady state

There is no interrupt. The chip runs a pass (pass, $0004): keep time on
the 1 Hz flag and play any sound, read the R4 row of buttons (read_keys,
$0504), read left and right (read_pad, $0380), and draw the screen when
something asked for it (draw_prep, $0600). In a game it then waits a
number of passes (wait, $0045) and runs one step (step, $0050): the
diver's arms, the boat's count of treasure, one tentacle, the catch, the
points and the next wait. Out of a game, with nothing to draw, it sleeps
with CEND and wakes at $0000 on the next second or a button; in the
clock each second runs a step of the demo. Power on and ACL start at
$03C0 (page $0F, step 0, power_on).

## The loader, in a paragraph

There is none. The program is in the chip; power on runs power_on.

## Files on the media

| File | Bytes | What it is | Where it lands |
|---|---|---|---|
| `oc-22` | 1,856 | the program | the ROM, $0000-$073F in the order the chip runs it |
| `gnw_octopus.svg` | 119,681 | MAME's drawing of the screen, one shape a segment | not in the chip: the screen the kit's pages draw on |
