## Interpreted programs and code loaded as level data

A machine-code trace can cover the interpreter while leaving most of the
game's decisions in an untraced bytecode stream. Follow the interpreter's
instruction pointer and dispatch table. Derive operand widths, tagged
values and branch addresses from the handlers, then decode the whole
stream and check that its branch targets land on instruction boundaries.
Keep those bytes typed as data in a CPU disassembler; describe each
bytecode routine and its control flow, and count the authored program in
the ledger. Do not mistake a successful CPU trace for an explanation of
the program it interprets.

A level file can contain executable callbacks among its header, tile
patches and map. Follow indirect calls into loaded buffers for every
shipped level, including an entry that initially returns at once. Save
each load separately: two files can give the same address different
meanings. State which image the canonical listing and coverage describe,
and document the other loads separately until the kit supports them in
its ledger. Never replace an annotated image with a later load merely to
make the map visible.
