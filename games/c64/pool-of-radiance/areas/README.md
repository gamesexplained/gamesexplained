# The area scripts

The tools behind the Maps tab's events and highlights. Each reads the
scripts (ECLnn) and maps (GEOnn) from the disk images' files in
`work/files/`, which are not committed.

- `ecl.py` decodes a script: `load` reads a file, `decode` turns bytes
  into commands, `flow` follows the control flow from the five entries.
  It is the decoder the How it works page carries, in Python.
- `events.py` ties every event of every script to its squares: for each
  square, Search on and off, each facing and three rolls of the dice, it
  runs the square's entry in a small interpreter and records the texts,
  menus, fights, treasure, damage, passwords and exits along the path.
  `--map 0D` limits it to one map, `--dump` prints what it found,
  `--json` writes it, and `--page levels.html` puts it in the Maps tab
  between `/* por-events */` and `// end of por-events`. A whole run
  takes about a minute.
- `highlights.py` lists the squares worth reading, each by a piece of
  its script's own text; `events.py` fails when a piece matches no
  event.

    python3 areas/events.py --json work/ecl/events.json --page levels.html
