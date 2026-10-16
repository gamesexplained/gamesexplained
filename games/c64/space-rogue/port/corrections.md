# What the port found wrong in the listing

Porting a routine means reading every instruction of it; each comment the port showed wrong is
corrected in the part's `symbols.json` and listed here (kit/skills/core/70-minisite/play.md, "What
the port finds in the listing").

| Part | Address | Was | Is |
|---|---|---|---|
| engine | $186F read_block | the block number's low byte in A | in X: the routine's first instruction is TXA (read_text_block's s_9CCE leaves it in X) |
| engine | $9977 arccos_rad | the label and its comment on $9977 | $9977 is the operand of the SBC at $9976; the arccosine in radians starts at $997B (JSR arccos_units, JMP units_to_radians) |
