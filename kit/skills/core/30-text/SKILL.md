---
name: 30-text
description: Decode the game's text when it uses a custom character set. Render the glyphs and read them; byte-pattern search cannot find text stored in a private alphabet.
---

# Text: render, don't grep

Games with a custom character set often use a **private alphabet** whose
glyph order has nothing to do with the system's screen codes. Byte-pattern
search, including every constant offset and XOR, finds nothing and tells
you nothing.

What works:

1. Locate the character set in memory (the video chip's base-address
   register says where; the platform reference explains the encoding).
2. Render the glyph table to an image (a PNG, or a text dump of 8×8 cells)
   and *read* it.
3. Build the substitution table from what you see: glyph index → letter.
4. Decode candidate string regions with that table. Runs of 5 or more
   letters that read as words are strings; keep going until the region
   ends.
5. Record the table in `facts.md` so nobody has to derive it again.

A game may use two or more alphabets at once: plain screen codes for small
labels and a bright display face for banners. Finding one does not mean
you have found the other.

**Inverted fonts.** When letters are stored as holes in a solid cell, the
space glyph is a solid block and "blank" screen areas are solid colour.
Set pixels take the foreground colour and holes show the background.

## Outputs

The alphabet table(s) in `facts.md`; every string region labelled and
commented in the disassembler; instruction text and control legends
copied into `features.md` as documented features.
