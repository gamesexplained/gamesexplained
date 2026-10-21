# The end sequence — verified technical facts

File IC, entered at `$C400` after the hundredth level. Every address here
is this part's. Unless marked *live*, a fact comes from the code in
`work/entry.vsf`, stopped on `$C400`.

- `end_sequence` (`$C400`): the picture (`end_picture`, `$C45B`: colour
  RAM from `$8FE8`, video bank 2, screen colours `$8C00`, bitmap `$A000`,
  multicolour bitmap mode), all RAM in view, the tune (`$0810`), then
  `end_loop` (`$C415`): a frame of the tune each frame, until fire or
  2,592 frames, then the resident's fresh start (`$CB71`).
- The tune's player (`$0810` start, `$0813` frame) has three voices and a
  sample channel: `sample_nmi` (`$0938`) writes four-bit steps to `$D418`
  on each NMI of CIA 2's timer A, whose rate sets the pitch (`$10CD`); the
  samples are `$1500`-`$886E` (`sample_table`, `$126A`).
- *Live*, 20 October 2026: the picture as `reference/ending.png`.
