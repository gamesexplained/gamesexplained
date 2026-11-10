# The temple — verified technical facts

SQRPACI64, the temple's code, its menu and its prices, which post-com's
HEAL (`heal`, `$209C`) loads into slot 1 at `$0400` when the party picks
HEAL at a temple. The same file is on all eight sides. Every address here
is the temple part's unless another part is named. Unless marked *live*,
a fact comes from the code in `entry.vsf`, the stop at post-com `$20BE`
just after the load, and is run by `test_temple.js` on the kit's 6502
over the listings.

- The menu (`menu_text`, `$0708`) has eleven cures and EXIT. HEAL shows
  it with the mask `$FDDF` (post-com `$20BE`-`$20C4`), one bit an item as
  `build_menu` (resident `$3CC3`) shifts it, so items 5 and 9, both named
  `@`, are never shown. *Live*: the menu at the Temple of Tempus lists
  nine cures and EXIT (`reference/live-temple.png`).
- The prices (`price_lo`/`price_hi`, `$0448`/`$0453`), in gold pieces:
  CURE BLINDNESS 1000, CURE DISEASE 1000, CURE LIGHT WOUNDS 100, CURE
  SERIOUS WOUNDS 350, CURE CRITICAL WOUNDS 600, item 5 5000, NEUTRALIZE
  POISON 1000, RAISE DEAD 5500, REMOVE CURSE 3500, item 9 20000, STONE TO
  FLESH 2000. `can_afford` (`$06EC`) compares 200 copper pieces to the
  gold piece.
- The routines are in post-com's `temple_lo`/`temple_hi` (`$20F8`/`$2103`).
  Items 5 and 9 both point at `$06D2`, which is `survival`, a table, not
  code.
- **Bug.** `end_first_kind` (`$05DA`) starts with `LDA #$00` to clear
  the count (`$2B5A`) and so loses the kind in A: it searches for kind 0,
  an empty entry of the 64 timed effects, finds one unless all 64 are in
  use, and counts it. CURE BLINDNESS (`$05ED`) loses kind `$21` (33,
  CAUSE BLINDNESS's) this way and CURE DISEASE (`$0607`) kind `$22` (34,
  CAUSE DISEASE's). Both then pay (post-com `cured`, `$22C2`) for any
  member. *Live*: a member with nothing wrong, at the Temple of Tempus,
  paid 1,000 gold pieces (200 platinum) for CURE BLINDNESS.
- CURE DISEASE still ends kinds `$32`, `$2B`, `$2C` and `$39`, clears
  the condition's bit 5 (IS DISEASED) and takes away kind `$1F`, the
  helpless, when the member holds it: mummy rot is cured.
- CURE SERIOUS WOUNDS (`$04E7`) rolls 2d8 and CURE CRITICAL WOUNDS
  (`$04ED`) 3d8, then both add `$6DB8`, `roll_dice`'s count of dice
  still to roll, which is 0 by then: 2 to 16 and 3 to 24.
- The wound cures help only a member whose condition is 1 (OK) or 5
  (UNCONSCIOUS) (`can_heal`, `$0400`); a dying member (4) is told THAT
  SPELL CAN NOT HELP YOU and pays nothing.
- RAISE DEAD (`$04FB`) refuses a member not DEAD and races 0, 2 (elf) and
  6 (half-orc), then pays (`cured`) before it rolls 0 to 99 against
  `survival` (`$06D2`): 0 for constitution 0 to 6, then 60, 65, 70, 75,
  80, 85, 90, 92, 94, 96, 98, 100 for 7 to 18, and 100 above. A failure
  leaves the member GONE (`$82`). *Live*: a DEAD member of constitution 6
  paid 5,500 gold pieces, saw CURED ... then FAILED (messages `$32` and
  `$1F`), and was left GONE.
- A raise (`raised`, `$0521`) costs a point of constitution and leaves 1
  hit point; the full hit points are worked out again from the new
  constitution (`con_bonus`, `$056B`, tables `$0584` and `$058F`).
- REMOVE CURSE (`$0693`) clears the readied bit of every readied cursed
  item and keeps its curse bit, then ends BESTOW CURSE's kind `$24`.
- `unzombie` (`$059A`) and NEUTRALIZE POISON (`$064D`) clear `$6BAD + X`
  after `has_item_type` (resident `$4027`); when the kind is found among
  the timed effects, X is that table's entry, not a place in the ten
  kinds. Open: what a raise of an ANIMATE DEAD zombie does (`TODO.md`).
