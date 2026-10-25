# The combat icon editor — verified technical facts

The editor GEN runs after a new character's portrait, and CAMP from
ALTER, ICON: SPELLN64's code at `$AF00` with its pieces' pictures
(CHARPIC00, `$9900`) and tables (SPELLE64, `$A700`). Every address here
is the icons part's. Unless marked *live*, a fact comes from the code in
`icon_editor`. Live tests are listed in the game's own `facts.md`.

- An icon is two poses, ready and attacking, of 3 by 3 characters, then
  their eighteen colours (`icon_codes`, `$AF00`); it is kept at `$4BE0`
  plus 36 times the party slot.
- The menu is ICON: PARTS COLOR SIZE EXIT (`icon_editor`, `$AF24`). The
  figure's size starts from the race: large for the man-sized races,
  small for dwarves, gnomes and halflings; SIZE flips it (`size_menu`,
  `$AFC7`). *Live*: the menu and a human's LARGE.
- PARTS offers WEAPON and HEAD; right and left step through the choices
  for the size (`pick_piece`, `$B0E6`): 23 large heads and 14 small ones
  (`large_head_first`, `$A8F0`; `small_head_first`, `$AAD0`).
- COLOR offers seven kinds of piece, WEAPON BODY CAP HAIR SHIELD ARM LEG,
  each with its own colour from 0 to 7 (`pick_color`, `$B2CD`); the kind
  of each character code is in `piece_types` (`$A700`).
- A cap or hair piece never replaces a piece of another kind in the top
  cells (`put_piece`, `$B209`).
- RETURN or the button keeps a choice and space throws it away
  (`read_choice_key`, `$B4FB`).
- Each figure is drawn by copying its pieces' pictures into characters
  `$60` and up of the character set (`draw_figure`, `$B361`).
