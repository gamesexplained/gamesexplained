## next · 9 October 2026 · Classic Adventure · air with Claude

**An index that counts down past zero lands 255 bytes on.** Classic
Adventure counts its turns as four ASCII digits and carries to the left
with X. On the 10,000th command the carry out of the thousands takes X
from 0 to `$FF`, and `INC turn_digits,X` lands on `turn_digits + $FF`,
which is the opcode of a store in the text printer: from then on every
text prints as a blank line. The first reading put the extra carry on
the byte before the digits and called it harmless. Work out the address
an indexed instruction reaches with the register at every value its loop
can leave it, `$FF` included, and read what lives there.

**Check a decoder's sentence against the stored lengths, not the
reader's stride.** The engine reads a rule's actions two bytes at a
time, code and argument, and the decoder that described all 452 action
lists said each was stored that way. The actions that take no argument
also end the rule, and the lists store them as one byte: 322 lists have
an odd length, and the byte the engine reads as the last argument is the
first of the next list. An independent check of 60 comments found three
wrong, all this one sentence. Comparing each record's stored length with
the number of bytes the reader takes finds the whole class at once.
