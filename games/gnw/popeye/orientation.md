# Popeye — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

MAME's ROM set `gnw_popeye.zip`, made for an older MAME: it holds `pp-23`,
the Sharp SM5A's program, 1,856 bytes, CRC32 49987769 and SHA-1
ad90659a3ce7169a4df16367c5307435d9f9d956, which match MAME 0.289's
driver, and `gnw_popeye.svg`, the screen, an older revision (218,428
bytes against the 218,587 MAME 0.289 expects; it draws the same 72
segments). The program is the chip's mask ROM, read out of a decapped
chip; it is the unit's whole program, with no loader and nothing in
front of it.

`check-emulator` on the kit's machine passed 9 of 9 on 9 November 2026,
with nothing to work around.

## From power-on to play

1. Copy the zip into `work/` and start the kit's server
   (`python3 kit/scripts/tools.py --platform gnw gnw`).
2. Load it and name the buttons, from MAME's driver block:

   ```python
   import sys, os; sys.path.insert(0, "kit/gnw")
   from gnw import connect
   m = connect()
   m.rom("games/gnw/popeye/work/gnw_popeye.zip")
   m.wiring(buttons={"time": "R4.K1", "game_b": "R4.K2", "game_a": "R4.K3",
                     "alarm": "R4.K4", "right": "alpha", "left": "beta",
                     "acl": "acl", "cheat": "R2.K1"}, low=[])
   ```

3. Power on lights every segment (mode 0). Run 3 s, press Game A for
   0.3 s and let it go: the game starts when the key is released.
4. Run 3 s more and save: `m.call("save", path=os.path.abspath(
   "games/gnw/popeye/work/play-gamea.gnw.json.gz"))`. That snapshot, at
   103,219 cycles from power on, is the one the listing is built from.

The listing does not depend on the moment: the snapshot holds the ROM,
which is all the listing reads from it.

## Steady state

There is no interrupt. The chip runs its main loop (main_loop, $0036):
keep time on the 1 Hz flag, draw the screen when something changed,
read the buttons, and in a game wait out a delay and run one step. Out
of a game, with nothing to draw, it sleeps with CEND and wakes at $0000
on the next second or a button. Reset and ACL start at $03C0 (page
$0F, step 0), which clears the memory (power_on, $0526).

## The loader, in a paragraph

There is none. The program is in the chip; power on runs power_on.
