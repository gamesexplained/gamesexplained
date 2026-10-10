# Cherryland: verified technical facts

The file `ld`, `$5A00`-`$B0FF`, laid out as Jellyland's
(`parts/jellyland/facts.md`). What is its own:

- Dust quota 10; the star count starts at 300 with a target of 50, a
  quota of 250, as Spottyland's loading line says. Time 250, sad and
  happy. No lightning.
- Sprite frames `$72`-`$74` and `$76`-`$78` differ from the other lands' (290 bytes of `$5A00`-`$62FF`), where those five lands are otherwise identical.
- 124 object records at `$A000`. `$A745`-`$A79E`, after the list's `$FF`,
  is byte for byte Spottyland's file at the same address, where it is the
  end of Spottyland's object list: a leftover the spawner never reads.
- Its loading line for Rockland says "STAR QUOTA : 338" (`$9185`), but
  Rockland's own file gives 378 - 30 = 348.
- Theo's speech at `$974C` begins "THANK GOOD-NESS YOU MADE IT, THINGS
  ARE GET-TING A BIT TRI-CKY OUT THERE."
