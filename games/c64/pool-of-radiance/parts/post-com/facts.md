# After a battle, shops and temples — verified technical facts

POST.COM, module 5: what follows a battle (the outcome, the experience,
the treasure), and the shops and temples the scripts open with the same
menu. Every address here is the post-com part's. Unless marked *live*, a
fact comes from the code in `entry.vsf`, the stop at the linker's call
into this module after the kobold fight. Live tests are listed in the
game's own `facts.md`.

## The outcome

- `postcom_start` (`$0800`) ages the party by the days gone by
  (`age_party`, `$1E1B`), clears the effects that last only for a fight
  and counts the combatants: fled, down, dead, standing (`$088E`).
- The outcome (`$0903`): won when someone in the party stands; with
  nobody standing, THE PARTY RUNS AWAY when some fled and THE PARTY HAS
  LOST when none did.
- After THE PARTY RUNS AWAY, the members left down where they fell leave
  the party, unless the script set `$6DE6` (`left_behind`, `$0DF8`).
- After THE PARTY HAS LOST the program waits for ever in a jump to itself
  at `$0957`, unless a party combatant was only marked out of the fight
  or the script set `$6DE6`. *Live*.

## Experience

- Every monster that went down and did not flee gives the experience in
  its record plus a figure times its full hit points (`$09BA`).
- The treasure gives experience too (`treasure_exp`, `$0D3D`): a point
  for every 200 copper, 20 silver or 2 electrum, one for each gold piece,
  5 for each platinum, 250 for each gem and 2,200 for each piece of
  jewelry; magic items give theirs (`magic_exp`).
- The total is shared among the members still standing, an NPC taking
  half a share (`work_out_share`, `$0BD2`), and each share passes through
  the class's adjustments (`class_exp`, `$1233`).
- An NPC in the party may pocket a monster's loot: a random number from
  0 to the shares, under the NPCs' hidden shares, keeps that monster's
  money and items out of the treasure (`$09D7`).

## Treasure

- The money a script sets out, and each monster's, is varied by
  `vary_amount` (`$0CBD`) to between 51 and 150 per cent.
- The menu (`postcom_menu`, `$0A2F`): HEAL BUY VIEW TAKE POOL SHARE
  APPRAISE DETECT EXIT, with only the items `menu_mask` (`$16FB`) allows
  for the place and the member.
- SHARE (`share_money`, `$21CD`) deals the pool's coins one at a time to
  the members with room; when nobody has room the coin just taken is
  lost.
- POOL adds each member's coins to the pool with an ADC that has no CLC
  before it (`$1AE2`), so a carry left by a kind that reached 65,535 adds
  one to the next.
- DROP money on the VIEW screen throws the coins away (`drop_money`,
  `$25D2`).

## Shops

- BUY (`buy_items`, `$0F71`) lists the shop's items; the price is the
  item's worth times the shop's factor `$6E6D` over 16, 16 being the
  usual price (`item_price`, `$13B4`).
- Buying, selling and identifying pay in platinum and gold: the member's
  money is counted together, the price taken, and the change given back
  as platinum and gold (`give_change`, `$136E`), so the copper, silver
  and electrum go, and any change under a gold piece is lost.
- SELL (`sell`, `$19AA`) removes the item and pays for it; what the member
  cannot carry goes to the pool. ID (`identify`, `$1D82`) costs 200 gold
  pieces.
- APPRAISE (`appraise`, `$1B26`) turns a gem or a piece of jewelry into an
  item with its worth: a gem by a d100 from 10 to 5,000 gold
  (`gem_worth`, `$1C54`), doubled again for as long as a roll of 0 to 9
  comes up 0. Jewelry was meant to double the same way, but its roll is
  of a die, which never gives 0, so it never does (`jewelry_worth`,
  `$1C9F`, the test at `$1CEF`).

## Temples

- HEAL (`heal`, `$209C`) loads the temple's own code and price list,
  SQRPACI64, at `$0400`, which no part holds, and calls back into this
  module to take the money and cure (`cured`, `$22C2`).

## Old age

- A member at or past its race's age limit dies of old age, GONE
  (`old_age`, `$215D`; the limits at `age_limit_lo`, `$2186`: dwarf 525,
  elf 1600, gnome 750, half-elf 325, halfling 199, half-orc 80, human
  120).
