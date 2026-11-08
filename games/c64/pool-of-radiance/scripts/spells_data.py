#!/usr/bin/env python3
"""The Spells tab's data, read from the game's own files: for every monster file (MON) on the eight
disk sides, its name, its alignment and the effect kinds it carries. Writes the JSON between the
por-specials tags of spells.html.

  python3 games/c64/pool-of-radiance/scripts/spells_data.py

It reads the files of the eight disk sides from work/files/<side>/, as bestiary_data.py does (see its
-h): work/ is gitignored, the images being the contributor's own copy.

A monster file is a character record. Its ten bytes from offset $AD ($6BAD once loaded) are the
effect kinds it always holds, the list has_item_type (resident, $4027) searches beside the timed
effects; 0 is an empty place. Its alignment is the byte at $D8 ($6BD8), 0 LAWFUL GOOD to 8 CHAOTIC
EVIL, as show_character (resident, $34EA) prints it (message 18 plus the byte). One entry is written
for each name and list of kinds, with the files that carry it.
"""
import json, os, re, sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from bestiary_data import GAME, side_files, name  # noqa: E402


def main():
    mons = side_files("MON")
    if not mons:
        sys.exit("no MON files under work/files: extract the disk sides first (bestiary_data.py -h)")
    groups = defaultdict(list)
    for (s, n), r in sorted(mons.items()):
        kinds = [k for k in r[0xAD:0xB7] if k]
        groups[(name(r), tuple(kinds), r[0xD8])].append([s, n])
    out = [{"n": nm, "k": list(k), "a": al, "f": files} for (nm, k, al), files in sorted(groups.items())]
    page = os.path.join(GAME, "spells.html")
    t = open(page).read()
    js = json.dumps(out, separators=(",", ":"))
    new, n = re.subn(r'(<script type="application/json" id="por-specials">).*?(</script>)',
                     lambda m: m.group(1) + js + m.group(2), t, flags=re.S)
    if n != 1:
        sys.exit("spells.html has no por-specials tag")
    open(page, "w").write(new)
    print(f"{len(out)} entries from {len(mons)} files, {len(js):,} bytes")


if __name__ == "__main__":
    if "-h" in sys.argv[1:]:
        print(__doc__)
        sys.exit()
    main()
