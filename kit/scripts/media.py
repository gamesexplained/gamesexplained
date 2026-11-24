#!/usr/bin/env python3
"""The media ledger: every item on the media a game was analysed from, and what each one is.

Coverage counts the bytes that were in memory when a part's snapshot was taken, so a file the
game loads into a slot and then replaces, or never loads, is invisible to it. The ledger closes
the list from the other side (kit/skills/core/12-media). A platform's reader
(kit/<platform>/media.py) lists every item on each image the contributor supplied: every file on
a disk, every run of sectors the disk's map marks as used that no file holds, every bank of a
cartridge, every file and block of a tape. Each item then gets one answer:

  part     its bytes are listed in a part ("part", its id; left out in a game of one load),
           at "at"; "packed": true when it unpacks into the part rather than lying there whole
  data     data the game loads into a buffer: a level, a picture, a monster, a tune; or what
           its loader shows and plays: a loading picture, a loading tune;
           "page" names the page that decodes it, when one does
  loader   stands in front of the game: the boot program, a fast loader, code for the drive,
           a protection, a cracker's intro, directory art
  saved    something the game writes: saved games, high scores, a party it ships with
  unused   nothing loads it: "why" says how that was shown (every load call and the loader's
           table of names searched, with names the game builds as it runs in mind)
  open     not explained yet

Every answer but open carries "why", what the item is, except a part the scan found whole:
90 % or more of the item's bytes equal to the part's listing at "at" ("matched" counts them).
A game at Silver or above created from MEDIA_SINCE, on a machine whose kit has a reader, needs
a media.json with no item open. An older game keeps its tier, and its About tab lists what is
still open.

media.json, in the game's folder (one for the whole game, whatever its parts):

  {"schema": 1,
   "images": [{"name": "side1", "file": "disk1.d64", "what": "disk side", "sha256": "...",
               "unread": "why its items could not be listed" (only then),
               "missing": sectors the DOS cannot read (only when some are)}],
   "items": [{"image": "side1", "label": "COMBAT", "place": {...}, "load": "$1000",
              "bytes": 9088, "sha256": "...", "also": ["side3"], "answer": "part",
              "part": "combat", "at": "$0800", "matched": 9080}, ...]}

An item with "traced": true is one no reader lists, added by `trace` from what the game was seen
to read or write (#902). A scan keeps it while its bytes on the image are the same, and opens it
again, saying so, when they are not.

"bytes" counts what reaches memory (a PRG without its address); "sha256" is of the item as it
lies on the medium. An item whose bytes another holds exactly is listed once, and "also" names
the others ("side3", or "side3: OTHER NAME"). An open item the scan matched in part carries
"near", where most of its bytes were found. A reader that lists an item in pieces, such as a run
of a disk's sectors, has each piece looked for on its own, since a loader may store them in an
order of its own; and bytes the listings hold only EORed with one byte are found too, and "near"
gives that "key" ("$C9"). Images stay in work/: the ledger keeps names, sizes and hashes, never
bytes (AGENTS.md, "No binaries, ever").

Usage:
  media.py scan <game dir> [<name>=]<image> [...]
                    read the images (each named by its file, or by <name>, such as side1) and write
                    media.json; a part's listing that holds 90 % of an open file's or bank's bytes
                    answers it; answers already given are kept for every item whose bytes have not
                    changed
  media.py trace <game dir> [<name>=]<image> <track> <sector>[-<last>] <answer> --why TEXT
                  [--label TEXT] [--part ID] [--at $ADDR] [--packed] [--page PAGE]
                    add sectors the game was traced reading or writing with the drive's block
                    commands that no item holds, because the disk's map marks them free (a high
                    score table): the image is one the ledger lists, why says what the trace showed
                    (the routine and the address the bytes go to), and the item is marked
                    "traced", so a later scan keeps it, while its bytes stay the same
  media.py answer <game dir> <pattern> <answer> [--part ID] [--at $ADDR] [--packed]
                  [--page PAGE] [--why TEXT] [--open-only]
                    answer every item whose label (or "image: label") matches the pattern
                    (shell-style: MON*, side2: *, track 17*)
  media.py <game dir>      what the media hold, by answer, and every open item
  media.py check           every game's media.json against the rules (check_docs.py runs it)
"""
import argparse, fnmatch, functools, glob, hashlib, importlib.util, json, os, re, sys
from collections import Counter
from pathlib import Path

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from accuracy import SILVER_UP   # noqa: E402

MEDIA_SINCE = "2026-11-11"   # games created from this day need a media.json with nothing open for Silver
ANSWERS = ("part", "data", "loader", "saved", "unused", "open")
WHOLE = 0.9                  # a part answers a file or bank when this share of its bytes is in the listing
NEAR = 0.25                  # an open item names where this share of its bytes was found
PROBE = 256                  # bytes of a piece tried under each one-byte key
KEYS = [bytes(b ^ k for b in range(256)) for k in range(256)]   # bytes.translate tables, one per key
SHOW = 40                    # open items the summary prints
FILE = "media.json"


@functools.lru_cache(maxsize=None)
def reader(platform):
    """The platform's media reader, kit/<platform>/media.py, or None when its kit has none. The
    search path is put back afterwards, so that the platform's modules hide none of the kit's."""
    path = os.path.join(ROOT, "kit", platform, "media.py")
    if not platform or not os.path.isfile(path):
        return None
    keep = list(sys.path)
    try:
        sys.path.insert(0, os.path.dirname(path))
        spec = importlib.util.spec_from_file_location(f"{platform}_media", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
    finally:
        sys.path[:] = keep
    return mod


def read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def game_of(gdir):
    return read_json(os.path.join(gdir, "game.json"))


def part_dirs(gdir):
    """{part id: folder} of the game's parts; {"": gdir} for a game of one load."""
    from parts import parts
    P = parts(gdir)
    return {p["id"]: p["dir"] for p in P} if P else {"": gdir}


def load(gdir):
    path = os.path.join(gdir, FILE)
    return read_json(path) if os.path.isfile(path) else None


IMAGE_KEYS = ("name", "file", "what", "sha256", "unread", "missing")
ITEM_KEYS = ("image", "label", "place", "load", "bytes", "sha256", "traced", "problem", "also", "answer", "part",
             "at", "matched", "packed", "page", "why", "near")


def save(gdir, led):
    """One image and one item a line, its keys in one order, so a diff shows what changed."""
    def row(x):
        rank = {k: n for n, k in enumerate(ITEM_KEYS if "label" in x else IMAGE_KEYS)}
        return json.dumps(dict(sorted(x.items(), key=lambda kv: rank.get(kv[0], len(rank)))),
                          ensure_ascii=False, separators=(", ", ": "))
    out = ['{"schema": 1,', ' "images": [']
    out += [f"  {row(i)}" + ("," if n < len(led["images"]) - 1 else "") for n, i in enumerate(led["images"])]
    out += [" ],", ' "items": [']
    out += [f"  {row(i)}" + ("," if n < len(led["items"]) - 1 else "") for n, i in enumerate(led["items"])]
    out += [" ]}"]
    Path(gdir, FILE).write_text("\n".join(out) + "\n", encoding="utf-8")


def hexa(n):
    return f"${n:04X}"


def unhex(s):
    return int(str(s).lstrip("$"), 16)


# --- finding an item's bytes in the listings -------------------------------------------------

def listing_memory(path):
    """(memory, mask) of the bytes a listing.json holds, at its own addresses."""
    recs = [r for r in read_json(path)["records"] if r.get("b")]
    top = max((r["a"] + len(r["b"]) for r in recs), default=0)
    mem, mask = bytearray(top), bytearray(top)
    for r in recs:
        mem[r["a"]:r["a"] + len(r["b"])] = bytes(r["b"])
        mask[r["a"]:r["a"] + len(r["b"])] = b"\1" * len(r["b"])
    return mem, mask


class Finder:
    """Where an item's bytes sit in the game's listings: 16-byte pieces of at least four
    different values vote for a part and an address, and the best is counted byte for byte."""

    def __init__(self, gdir):
        self.parts, self.index = {}, {}
        for pid, d in part_dirs(gdir).items():
            path = os.path.join(d, "listing.json")
            if not os.path.isfile(path):
                continue
            mem, mask = self.parts[pid] = listing_memory(path)
            run = 0
            for a in range(len(mask)):
                run = run + 1 if mask[a] else 0
                if run >= 16:
                    piece = bytes(mem[a - 15:a + 1])
                    if len(set(piece)) >= 4:
                        hits = self.index.setdefault(piece, [])
                        if len(hits) < 50:
                            hits.append((pid, a - 15))

    def places(self, data, at=None):
        """{part id: (bytes equal, address)}: the best place for the bytes in each part's listing
        that the pieces vote for, and `at`, the address the bytes are known to load to, in
        every part."""
        votes = Counter()
        for off in range(0, len(data) - 15, 8):
            for pid, s in self.index.get(bytes(data[off:off + 16]), ()):
                votes[(pid, s - off)] += 1
        tries = [k for k, _ in votes.most_common(6)]
        if at is not None:
            tries += [(pid, at) for pid in self.parts]
        best = {}
        for pid, base in tries:
            mem, mask = self.parts[pid]
            n = sum(1 for i, x in enumerate(data)
                    if 0 <= base + i < len(mem) and mask[base + i] and mem[base + i] == x)
            if n > best.get(pid, (0, None))[0]:
                best[pid] = (n, base)
        return best

    def keyed(self, data, at=None):
        """(key, places) for bytes the listings hold, as they are or EORed with one byte, as a
        loader may keep a disk's tracks (Ikari Warriors, tracks 8 to 14 with $C9, #985). The
        bytes as they are come first; while those match less than half, each key is tried on the
        first PROBE bytes, and of those whose 16-byte pieces the listings hold, the one that
        matches most is counted. Key 0 is the bytes as they are."""
        got = self.places(data, at)
        best = max((n for n, _ in got.values()), default=0)
        if 2 * best >= len(data) or len(set(data)) < 4:     # found, or a fill no piece is made of
            return 0, got
        head, key = bytes(data[:PROBE]), 0
        for k in range(1, 256):
            probe = head.translate(KEYS[k])
            if not any(probe[o:o + 16] in self.index for o in range(0, len(probe) - 15, 8)):
                continue
            more = self.places(bytes(data).translate(KEYS[k]), at)
            n = max((n for n, _ in more.values()), default=0)
            if n > best:
                best, key, got = n, k, more
        return key, got

    def find(self, data):
        """(bytes equal, part id, address, key) of the best place, or (0, None, None, 0)."""
        best = (0, None, None, 0)
        key, got = self.keyed(data)
        for pid, (n, base) in got.items():
            if n > best[0]:
                best = (n, pid, base, key)
        return best

    def pieces(self, pieces):
        """The same for an item that reaches memory in pieces (a track's sectors or the runs a
        loader stored), each (address or None, bytes): every piece is looked for on its own, and
        the part that holds the most of them answers, at the place of its first piece, with the
        key that matched most of its bytes. Parts that share code each count the pieces they
        hold, so the shared piece does not go to one part and the rest of the item to another."""
        held, first, keys = Counter(), {}, {}
        for at, data in pieces:
            key, got = self.keyed(data, at)
            for pid, (n, base) in got.items():
                held[pid] += n
                first.setdefault(pid, base)
                keys.setdefault(pid, Counter())[key] += n
        if not held:
            return (0, None, None, 0)
        pid, n = held.most_common(1)[0]
        return (n, pid, first[pid], keys[pid].most_common(1)[0][0])



# --- scan ------------------------------------------------------------------------------------

def scan(gdir, images):
    game = game_of(gdir)
    rd = reader(game["platform"])
    if rd is None:
        sys.exit(f"kit/{game['platform']}/ has no media.py: the kit cannot list this machine's media yet")
    old = load(gdir) or {"images": [], "items": []}
    kept = {(i["image"], i["label"], i["sha256"]): i for i in old["items"]}
    by_bytes = {i["sha256"]: i for i in old["items"] if i.get("bytes")}   # an image renamed or reordered
    names, led = Counter(), {"images": [], "items": []}
    by_hash, paths = {}, {}
    for arg in images:
        stem, eq, path = arg.partition("=")
        if not eq or not stem or os.path.exists(arg):
            stem, path = os.path.splitext(os.path.basename(arg))[0], arg
        if not os.path.isfile(path):
            sys.exit(f"{path}: no such file")
        stem = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip("-") or "image"
        names[stem] += 1
        name = stem if names[stem] == 1 else f"{stem}-{names[stem]}"
        got = rd.items(path)
        img = {"name": name, "file": os.path.basename(path), "what": got["what"],
               "sha256": hashlib.sha256(Path(path).read_bytes()).hexdigest()}
        if got.get("unread"):
            img["unread"] = got["unread"]
        if got.get("missing"):
            img["missing"] = got["missing"]
        led["images"].append(img)
        paths[name] = path
        labels = Counter()
        for it in got["items"] or []:
            labels[it["label"]] += 1
            label = it["label"] if labels[it["label"]] == 1 else f"{it['label']} ({labels[it['label']]})"
            h = hashlib.sha256(it["raw"]).hexdigest()
            if it["raw"] and h in by_hash:
                first = by_hash[h]
                also = name if label == first["label"] else f"{name}: {label}"
                first.setdefault("also", []).append(also)
                continue
            item = {"image": name, "label": label, "place": it["place"]}
            if it.get("load") is not None:
                item["load"] = hexa(it["load"])
            item["bytes"] = len(it["data"])
            item["sha256"] = h
            if it.get("problem"):
                item["problem"] = it["problem"]
            was = kept.get((name, label, h)) or (by_bytes.get(h) if it["raw"] else None)
            if was:
                item.update({k: v for k, v in was.items() if k not in item and k != "also"})
            elif it.get("blank"):
                item.update(answer="unused", why=f"every byte holds ${it['raw'][0]:02X}")
            else:
                item["answer"] = "open"
            item["_data"] = it["data"]
            item["_pieces"] = list(it.get("pieces") or ())
            led["items"].append(item)
            if it["raw"]:
                by_hash[h] = item
    retraced = keep_traced(rd, old, led, paths)
    find = Finder(gdir)
    for item in led["items"]:
        data, pieces = item.pop("_data"), item.pop("_pieces")
        if item["answer"] != "open" or len(data) < 16:
            continue
        item.pop("near", None)
        n, pid, base, key = find.pieces(pieces) if pieces else find.find(data)
        if not n:
            continue
        where = {"at": hexa(base), "matched": n}
        if pid:
            where = {"part": pid, **where}
        if key:
            where["key"] = f"${key:02X}"
        # a stray sector only hints, and so do bytes found through a key: the answer says how they are kept
        if n >= WHOLE * len(data) and "sectors" not in item["place"] and not key:
            item.pop("near", None)
            item.update(answer="part", **where)
        elif n >= NEAR * len(data):
            item["near"] = where
    now = {i["sha256"] for i in led["items"]}
    gone = [k for k, i in kept.items() if k[2] not in now and i["answer"] != "open"]
    save(gdir, led)
    report(gdir)
    for line in retraced:
        print(line)
    if gone:
        print(f"\n{len(gone)} answered item(s) of the old media.json are on none of these images, and were dropped:")
        for im, lab, _ in gone[:20]:
            print(f"  {im}: {lab}")


# --- traced sectors --------------------------------------------------------------------------

def sector_span(place):
    """(track, first, last) of an item's place on a disk, or None: a run lists "sectors": [a, b],
    and a row written by hand may give "sector": s."""
    if not isinstance(place, dict) or "track" not in place or "file" in place:
        return None
    if isinstance(place.get("sectors"), list) and len(place["sectors"]) == 2:
        return place["track"], place["sectors"][0], place["sectors"][1]
    if isinstance(place.get("sector"), int):
        return place["track"], place["sector"], place["sector"]
    return None


def traced_item(rd, image, path, track, first, last):
    """A new traced item's place, size and hash, from the reader's sectors()."""
    raw = rd.sectors(path, track, first, last)
    return {"image": image, "label": f"track {track}, sector {first}" if first == last
            else f"track {track}, sectors {first}-{last}",
            "place": {"track": track, "sectors": [first, last]}, "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest(), "traced": True}


def keep_traced(rd, old, led, paths):
    """Put the old ledger's traced items back into a new scan's, each read again from its image:
    kept as it was while its bytes are the same, opened again when they are not, and handed to
    an item of the scan's own that now lists the same sectors (the map marks them used).
    Returns what to say about the ones that changed."""
    said = []
    for t in [i for i in old["items"] if i.get("traced")]:
        span, path = sector_span(t["place"]), paths.get(t["image"])
        if span is None or path is None or not hasattr(rd, "sectors"):
            continue                                 # the image was not scanned: dropped with the rest
        same = next((i for i in led["items"] if i["image"] == t["image"] and sector_span(i["place"]) == span), None)
        if same is not None:
            if same["answer"] == "open":
                same.update({k: v for k, v in t.items() if k in ("answer", "part", "at", "packed", "page", "why")})
            said.append(f"{t['image']}: {t['label']} is listed by the scan now, as {same['label']}: its answer moved there")
            continue
        raw = rd.sectors(path, *span)
        item = dict(t, bytes=len(raw), _data=raw, _pieces=[])
        if hashlib.sha256(raw).hexdigest() != t["sha256"]:
            for k in ("part", "at", "matched", "packed", "page", "near"):
                item.pop(k, None)
            item.update(sha256=hashlib.sha256(raw).hexdigest(), answer="open",
                        why=f"traced; its bytes changed since the answer ({t['answer']}: {t.get('why', '')})")
            said.append(f"{t['image']}: {t['label']}, a traced item, holds other bytes now: it is open again")
        led["items"].append(item)
    return said


def trace(gdir, image, span, ans, why, label=None, part=None, at=None, packed=False, page=None):
    led = load(gdir)
    if led is None:
        sys.exit(f"{gdir}: no {FILE}; run media.py scan first")
    rd = reader(game_of(gdir)["platform"])
    if rd is None or not hasattr(rd, "sectors"):
        sys.exit("this machine's media reader cannot read sectors yet, so nothing can be traced here")
    if not str(why or "").strip():
        sys.exit("--why says what the trace showed: the routine that reads or writes the sectors, and where "
                 "their bytes go")
    stem, eq, path = image.partition("=")
    if not eq or os.path.exists(image):
        stem, path = None, image
    if not os.path.isfile(path):
        sys.exit(f"{path}: no such file")
    h = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    img = next((i for i in led["images"] if (stem is None or i["name"] == stem) and i.get("sha256") == h), None)
    if img is None:
        sys.exit(f"{path} is " + (f"not the image {stem}" if stem else "none of the images") + f" {FILE} lists: "
                 "scan it first, or give the ledger's name for it, <name>=<image>")
    track, first, last = span
    if last < first:
        sys.exit("the sectors run backwards")
    for i in led["items"]:
        got = sector_span(i["place"]) if i["image"] == img["name"] else None
        if got and got[0] == track and not (got[2] < first or got[1] > last) and not i.get("traced"):
            sys.exit(f"{img['name']}: {i['label']} lists those sectors already: answer it with media.py answer")
    item = traced_item(rd, img["name"], path, track, first, last)
    if label:
        item["label"] = label
    item.update(answer=ans, why=why)
    if ans == "part":
        P = part_dirs(gdir)
        if "" not in P and part not in P:
            sys.exit(f"--part names one of the game's parts: {', '.join(sorted(P))}")
        if part:
            item["part"] = part
        if at:
            item["at"] = hexa(unhex(at))
        if packed:
            item["packed"] = True
    if page:
        if not os.path.isfile(os.path.join(gdir, page)):
            sys.exit(f"--page {page}: no such page in the game's folder")
        item["page"] = page
    led["items"] = [i for i in led["items"]
                    if not (i.get("traced") and i["image"] == img["name"] and sector_span(i["place"]) == (track, first, last))]
    led["items"].append(item)
    save(gdir, led)
    print(f"{img['name']}: {item['label']}, {item['bytes']} bytes, traced and answered {ans}")


# --- answering -------------------------------------------------------------------------------

def answer(gdir, pattern, ans, part=None, at=None, packed=False, page=None, why=None, open_only=False):
    led = load(gdir)
    if led is None:
        sys.exit(f"{gdir}: no {FILE}; run media.py scan first")
    if ans not in ANSWERS:
        sys.exit(f"answer is one of {', '.join(ANSWERS)}")
    P = part_dirs(gdir)
    if ans == "part" and "" in P and part:
        sys.exit("the game is one load: leave --part out")
    if ans == "part" and "" not in P and part not in P:
        sys.exit(f"--part names one of the game's parts: {', '.join(sorted(P))}")
    if page and not os.path.isfile(os.path.join(gdir, page)):
        sys.exit(f"--page {page}: no such page in the game's folder")
    n = 0
    for item in led["items"]:
        if open_only and item["answer"] != "open":
            continue
        if not (fnmatch.fnmatchcase(item["label"], pattern)
                or fnmatch.fnmatchcase(f"{item['image']}: {item['label']}", pattern)):
            continue
        for k in ("part", "at", "matched", "packed", "page", "why", "near"):
            item.pop(k, None)
        item["answer"] = ans
        if ans == "part":
            if part:
                item["part"] = part
            if at:
                item["at"] = hexa(unhex(at))
            if packed:
                item["packed"] = True
        if page:
            item["page"] = page
        if why:
            item["why"] = why
        n += 1
    if not n:
        sys.exit(f"no item matches {pattern!r}" + (" among the open ones" if open_only else ""))
    save(gdir, led)
    print(f"{n} item(s) answered {ans}")


# --- what the ledger says --------------------------------------------------------------------

def counts(led):
    return Counter(i["answer"] for i in led["items"])


def summary(gdir):
    """What the About tab says: None for a game with no media.json, else {"images", "files",
    "runs", "banks", "blocks" (a tape's with no header), "stretches" (of a tape, that no reader
    decodes), "tracks" (of a disk listed track by track), "copies" (items left out because another holds the same bytes), "count" (by answer), "open", "unused" (labels), "unread", "missing"}."""
    led = load(gdir)
    if led is None:
        return None
    many = len(led["images"]) > 1
    lab = lambda i: f"{i['label']} ({i['image']})" if many else i["label"]
    kinds = Counter(next((k for k in ("file", "bank", "block", "pulses", "sectors", "track") if k in i["place"]), "run")
                    for i in led["items"])
    kinds["run"] += kinds.pop("sectors", 0)       # a run of sectors names its track too
    return {"images": Counter(i["what"] for i in led["images"]),
            "files": kinds["file"], "runs": kinds["run"], "banks": kinds["bank"], "blocks": kinds["block"],
            "stretches": kinds["pulses"], "tracks": kinds["track"],
            "copies": sum(len(i.get("also", ())) for i in led["items"]),
            "count": counts(led),
            "open": [lab(i) for i in led["items"] if i["answer"] == "open"],
            "unused": [lab(i) for i in led["items"] if i["answer"] == "unused"],
            "unread": [i["name"] for i in led["images"] if i.get("unread")],
            "missing": sum(i.get("missing", 0) for i in led["images"])}


def report(gdir):
    led = load(gdir)
    if led is None:
        print(f"{gdir}: no {FILE} (media.py scan <game dir> <image> ... makes it)")
        return
    c = counts(led)
    print(f"{len(led['images'])} image(s), {len(led['items'])} different items: "
          + ", ".join(f"{c[a]} {a}" for a in ANSWERS if c[a]))
    for i in led["images"]:
        if i.get("unread"):
            print(f"  {i['name']}: not listed ({i['unread']})")
        if i.get("missing"):
            print(f"  {i['name']}: {i['missing']} sectors the DOS cannot read are in no item")
    opened = [i for i in led["items"] if i["answer"] == "open"]
    if opened:
        print("\nopen:")
        for i in opened[:SHOW]:
            near = i.get("near")
            hint = (f"  near {near.get('part') or 'the listing'} at {near['at']}: {near['matched']} of {i['bytes']} bytes"
                    + (f", each EORed with {near['key']}" if near.get("key") else "") if near else "")
            load_at = f" loads at {i['load']}" if i.get("load") else ""
            print(f"  {i['image']}: {i['label']:<22} {i['bytes']:6} bytes{load_at}{hint}")
        if len(opened) > SHOW:
            print(f"  and {len(opened) - SHOW} more (media.json has every one)")


# --- the rules -------------------------------------------------------------------------------

def problems(gdir, game):
    """What is wrong with one game's ledger, as sentences; empty when nothing is."""
    led, out = None, []
    try:
        led = load(gdir)
    except ValueError as e:
        return [f"{FILE} does not parse: {e}"]
    required = (game.get("tier") in SILVER_UP and str(game.get("created") or "") >= MEDIA_SINCE
                and reader(game.get("platform", "")) is not None)
    if led is None:
        return [f"Silver or above with no {FILE}: list the media with kit/scripts/media.py scan "
                "(kit/skills/core/12-media)"] if required else []
    if not isinstance(led.get("images"), list) or not isinstance(led.get("items"), list):
        return [f'{FILE} needs "images" and "items", lists']
    P = part_dirs(gdir)
    names = {i.get("name") for i in led["images"]}
    for i in led["images"]:
        if re.search(r"[/\\]", str(i.get("file", ""))):
            out.append(f"image {i.get('name')} gives a path, {i['file']!r}: keep the file's name only")
    for i in led["items"]:
        lab = f"{i.get('image')}: {i.get('label')}"
        a = i.get("answer")
        if i.get("image") not in names:
            out.append(f"{lab} is on no image the ledger lists")
        if a not in ANSWERS:
            out.append(f"{lab} has answer {a!r}, not one of {', '.join(ANSWERS)}")
            continue
        if a == "part":
            if "" in P:
                if i.get("part"):
                    out.append(f"{lab} names part {i['part']!r}, but the game is one load: leave part out")
            elif i.get("part") not in P:
                out.append(f"{lab} names part {i.get('part')!r}, which the game does not have")
            whole = isinstance(i.get("matched"), int) and i["matched"] >= WHOLE * i.get("bytes", 0)
            if not whole and not str(i.get("why") or "").strip():
                out.append(f"{lab} is a part the scan did not find whole: say why (packed, or partly "
                           "written over) in why")
        elif a != "open" and not str(i.get("why") or "").strip():
            out.append(f"{lab} is {a} with no why: say what it is")
        if i.get("page") and not os.path.isfile(os.path.join(gdir, i["page"])):
            out.append(f"{lab} names page {i['page']!r}, which the game's folder does not have")
    left = [i for i in led["items"] if i.get("answer") == "open"]
    if required and left:
        out.append(f"Silver or above with {len(left)} open item(s) in {FILE}, the first "
                   f"{left[0].get('image')}: {left[0].get('label')}: answer each (kit/scripts/media.py)")
    return out


def check():
    """Exit status for check_docs.py: 1 if any game's ledger breaks a rule."""
    fails = 0
    for gj in sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "game.json"))):
        gdir = os.path.dirname(gj)
        try:
            game = read_json(gj)
        except ValueError:
            continue
        for p in problems(gdir, game):
            print(f"  x  {os.path.relpath(gdir, ROOT)}  {p}")
            fails += 1
    return 1 if fails else 0


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        return 0
    if sys.argv[1] == "check":
        return check()
    if sys.argv[1] == "scan":
        if len(sys.argv) < 4:
            sys.exit("media.py scan <game dir> [<name>=]<image> [...]")
        scan(sys.argv[2], sys.argv[3:])
        return 0
    if sys.argv[1] == "trace":
        ap = argparse.ArgumentParser(prog="media.py trace")
        ap.add_argument("gdir"); ap.add_argument("image"); ap.add_argument("track", type=int)
        ap.add_argument("sectors"); ap.add_argument("answer", choices=ANSWERS)
        ap.add_argument("--why"); ap.add_argument("--label"); ap.add_argument("--part"); ap.add_argument("--at")
        ap.add_argument("--packed", action="store_true"); ap.add_argument("--page")
        a = ap.parse_args(sys.argv[2:])
        m = re.fullmatch(r"(\d+)(?:-(\d+))?", a.sectors)
        if not m:
            sys.exit("sectors: a number, or a first and last, 3-7")
        span = (a.track, int(m.group(1)), int(m.group(2) or m.group(1)))
        trace(a.gdir, a.image, span, a.answer, a.why, a.label, a.part, a.at, a.packed, a.page)
        return 0
    if sys.argv[1] == "answer":
        ap = argparse.ArgumentParser(prog="media.py answer")
        ap.add_argument("gdir"); ap.add_argument("pattern"); ap.add_argument("answer", choices=ANSWERS)
        ap.add_argument("--part"); ap.add_argument("--at"); ap.add_argument("--packed", action="store_true")
        ap.add_argument("--page"); ap.add_argument("--why"); ap.add_argument("--open-only", action="store_true")
        a = ap.parse_args(sys.argv[2:])
        answer(a.gdir, a.pattern, a.answer, a.part, a.at, a.packed, a.page, a.why, a.open_only)
        return 0
    report(sys.argv[1])
    return 0


if __name__ == "__main__":
    sys.exit(main())
