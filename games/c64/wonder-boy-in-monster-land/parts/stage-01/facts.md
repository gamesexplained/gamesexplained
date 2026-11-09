# First load — verified technical facts

### Opening messages

The first-load snapshot contains a welcome message at `$92A0` and quest messages at `$9493`, `$94B7`, `$94F0` and `$9520`. Each has three zero-terminated fields followed by `$FF`; the resident message routine at `$77E2` copies the fields to its buffers and waits for Fire on that control byte. The fields include the game's spelling “The countrys fate / despends on you.” The first-load code supplies these records to the resident message routine; their presence alone does not establish a natural route to every message.

### Map tiles

The resident loop at `$6D41–$6D63` reads a map byte as an index into four 256-byte tables at `$81CF`, `$82CF`, `$83CF` and `$84CF`. It writes their values into the top-left, top-right, bottom-left and bottom-right positions of a two-by-two character block; the lower row is 40 screen cells after the upper. The movement checks at `$0C57`, `$0EB8` and `$1051` use the map byte as an index into the attribute table at `$80CF`: downward movement tests bits 0–1 and horizontal movement tests bit 1. The meanings of every attribute combination remain open.
