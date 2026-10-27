# The Z-machine, version by version

What changes between the versions, with the Z-Machine Standards Document
1.1's section for each (https://inform-fiction.org/zmachine/standards/z1point1/).
Infocom wrote versions 1 to 6; 7 and 8 were added for later compilers.
The version is the story's first byte. `kit/zmachine/` follows every rule
here, and `kit/zmachine/test_story.py` and `test_bocfel.py` hold it to them.

## Memory

| | 1-3 | 4-5 | 6-7 | 8 | Section |
|---|---|---|---|---|---|
| largest story | 128 KB | 256 KB | 512 KB | 512 KB | 1.1.4 |
| packed address P, as a byte address | 2P | 4P | 4P + 8 × the header's routine or string offset ($28, $2A) | 8P | 1.2.3 |
| the first instruction (header $06) | its address | its address | the packed address of a routine, `main` | its address | 5.4, 5.5 |

Dynamic memory runs from 0 to the header's static base ($0E), static
memory from there to the end of the story or $FFFF, and high memory,
where the code and most strings are, from the header's high base ($04).
The header's length ($1A) and checksum ($1C) are there from version 3:
the length counts in units of 2 bytes to version 3, 4 in 4 and 5, 8 from
6, and the checksum is the sum of the bytes from $40 to the end, which
`verify` compares (11.1, 15 `verify`). The abbreviations table ($18) is
there from version 2, the alphabet table ($34) from 5.

## Text

Text is 5-bit Z-characters, three to a word, the top bit set on the last
word (3.2). Z-character 0 is a space; 6 in A2 starts a ten-bit ZSCII code
in the next two (3.4).

| | 1 | 2 | 3 on | Section |
|---|---|---|---|---|
| Z-character 1 | a new line | abbreviation 0-31, by the next | 1, 2 and 3: abbreviation 32 × (z − 1) + the next, 96 in all | 3.3, 3.5.2 |
| 2 and 3 | shift for one character, relative to the current alphabet | as 1 | abbreviations | 3.2.2 |
| 4 and 5 | shift lock, relative to the current alphabet | as 1 | shift to A1 (4) or A2 (5) for one character; A0 is always current | 3.2.2, 3.2.3 |
| A2 from Z-character 7 | `0123456789.,!?_#'"/\<-:()` | a new line, then `0123456789.,!?_#'"/\-:()` | as 2, unless version 5's alphabet table replaces all three alphabets (6 and 7 of A2 stay the escape and the new line) | 3.5.3-3.5.5 |
| a dictionary word | 6 Z-characters, in 4 bytes, padded with 5s | as 1 | 6 to version 3, 9 in 6 bytes from version 4 | 3.7, 13.3, 13.4 |
| shifts in a dictionary word | a shift lock where the next two characters are of the same other alphabet | as 1 | single shifts | 3.7.1 |

ZSCII 155 to 223 print the accented letters of the default table, which
a story's own Unicode table replaces from version 5 (3.8.5).

## Objects

| | 1-3 | 4 on | Section |
|---|---|---|---|
| objects | up to 255 | up to 65,535 | 12.3.1, 12.3.2 |
| property defaults before the first object | 31 words | 63 words | 12.2 |
| an object's entry | 9 bytes: 32 attributes, then parent, sibling and child a byte each, then its property table's address | 14 bytes: 48 attributes, then parent, sibling and child a word each, then the address | 12.3.1, 12.3.2 |
| a property's size byte | 32 × (length − 1) + number: up to 31 properties of 1 to 8 bytes | top bit clear: number in the low 6 bits, bit 6 set for 2 bytes, clear for 1; top bit set: a second byte whose low 6 bits are the length, 0 meaning 64 | 12.4.1, 12.4.2 |

A property table starts with its short name: a byte giving its length in
words, then the text. Properties follow in descending order of number,
and a 0 size byte ends them (12.4). The table does not say how many
objects there are; `story.py` counts entries up to the lowest property
table, where Infocom's compiler put the first.

## Routines and instructions

A routine starts with a byte giving its locals, 0 to 15, followed to
version 4 by their first values, a word each; from version 5 they start
at 0 (5.2).

The first byte of an instruction gives its form (4.3): $BE from version
5 is the extended form, an opcode byte, then a byte of operand types; top
bits 11 the variable form, bit 5 clear for a 2OP and set for a VAR, then
a byte of types (two for `call_vs2` and `call_vn2`, 4.4.3.1); 10 the short
form, a 1OP whose type is in bits 5 and 4, or a 0OP when they are 11; and
otherwise the long form, a 2OP whose two operands are a small constant or
a variable, by bits 6 and 5. A type is a large constant (two bytes), a
small one (one byte), a variable (one byte: 0 the stack, 1-15 the locals,
16-255 the globals) or none (4.2).

After the operands come the variable a result is stored to (4.6), then a
branch (4.7): bit 7 says whether it branches on true or false; with bit 6
set the offset is the low 6 bits, otherwise 14 bits, signed, over two
bytes. An offset of 0 returns false and 1 returns true; any other goes to
the address after the branch + offset − 2. `jump` takes its offset as a
signed operand, by the same sum. `print` and `print_ret` carry their text
after the opcode (4.8).

What changes, by version (14, and each opcode in 15):

| Opcode | 1-3 | 4 | 5 on |
|---|---|---|---|
| 0OP 5, 6 `save`, `restore` | branch | store | gone: the extended `save` and `restore` |
| 0OP 9 | `pop` | `pop` | `catch`, which stores |
| 0OP 12 `show_status` | 3 only | | |
| 0OP 13 `verify` | from 3 | yes | yes |
| 0OP 15 `piracy` | | | yes |
| 1OP 8 `call_1s` | | yes | yes |
| 1OP 15 | `not` | `not` | `call_1n`; `not` moves to VAR 24 |
| 2OP 25 `call_2s` | | yes | yes |
| 2OP 26-28 `call_2n`, `set_colour`, `throw` | | | yes |
| VAR 0 | `call` | `call_vs` | `call_vs` |
| VAR 4 | `sread`, which also shows the status line to 3 | `sread` | `aread`, which stores the key that ended the line |
| VAR 10, 11, 19-21 | from 3 | yes | yes |
| VAR 12-18, 22, 23 | | yes | yes |
| VAR 24-31 | | | yes |
| VAR 9 `pull` | a variable's number | as 1-3 | as 1-3, but in 6 it stores |

## Reading a line

`sread` and `aread` read into a text buffer whose byte 0 is its size (15
`read`). To version 4 the text goes from byte 1 to a zero; from 5 byte 1
holds how many characters there are and the text starts at byte 2, and
what is there already counts as typed. The parse buffer's byte 0 is the
most words it takes and byte 1 how many there were; then four bytes a
word: its dictionary entry's address (0 when it has none), its length,
and where it starts in the text buffer. A word is split at spaces and at
the dictionary's separators, which are words themselves (13.6).
