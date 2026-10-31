# The title — verified technical facts

File TP (tape 1 side 1), `$1800`-`$9FFF`, entered at `$8000` by the
resident's script. Every address here is this part's. Unless marked
*live*, a fact comes from the code in `work/entry.vsf`, stopped on
`$8000`.

- First a picture in video bank 0 (`title_main`, `$8000`: screen from
  `$1800`, colours from `$1C00`, bitmap `$2000`) for a delay of 12 × 65,536
  turns of a loop, then the title scene in bank 1 (`title_video`, `$80D3`).
- The scene: a multicolour bitmap with a text band of fourteen rows at the
  top, by two raster interrupts (`title_irq_top`, `$82EE`, line `$0A`, text
  with the font at `$7800`; `title_irq_bitmap`, `$833B`, line `$A3`, the
  bitmap); animated sprites; the credits, five pages of six lines in screen
  codes (`credits_text`, `$8584`), each sliding in from one side, staying
  325 frames and sliding out, the side alternating (`$83C2`-`$83C7`).
- The tune: the driver at `$9000` (`music_init`, `$9000`; `music_play`,
  `$9003` from the interrupt), three voices with order lists, 48 patterns
  and instruments of eight bytes (`$969F`-`$97E5`).
- Space or fire fades the tune and the title ends (`music_fade`, `$9006`).
