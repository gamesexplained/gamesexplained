# Ghidra listing exporter

`import_ghidra.py` accepts the legacy **CompleteListingWriter** format from
[ghidra-mcp-next](https://github.com/64kramsystem/ghidra-mcp-next), exposed there
as `export_full_listing`. It is a custom exporter, not Ghidra's stock ASCII
export. Stock ASCII output is unsupported; changing its display widths does
not turn it into this format.

The bundled source is pinned to
[1a7718d310e921061658ee31f22aca9194482b5b](https://github.com/64kramsystem/ghidra-mcp-next/tree/1a7718d310e921061658ee31f22aca9194482b5b/src/main/java/com/xebyte/core),
the revision before outgoing references changed from `XREF from` to `XREF to`.
That revision targets Ghidra 12.1.2. The original exports did not record their
export-time Ghidra version or exporter commit, so the pin identifies a
reproducible compatible format rather than a recovered run identifier.
The bundled scripts and fixture were exercised with **Ghidra 12.1.4**, build
revision `8b6bbb857accdfa20dc5b2f5dea471178c2e9fbc`, on 1 October 2026.

The Apache-2.0 licence and upstream notice are included. Changes to the copied
Java source:

- `CompleteListingWriter`: expose the class, constructor, `write` and
  `shortfall` so a standalone Ghidra script can call them.
- `ListingRangeService`: retain the exporter's records, range index and their
  helpers; omit MCP request handling and JSON rendering.
- `ReferenceOrdering`: unchanged apart from the provenance comment.

No MCP extension is required. Add this directory to Ghidra's Script Manager,
open the contributor's program, and run `ExportGhidraListing.java`. Choose
the destination when prompted, or pass it as the script's single argument
when running headlessly. Write into the game's gitignored
`work/` directory. A selection exports just that selection; otherwise the
script exports the program's memory. The wrapper uses a 120-column XREF wrap
width and checks the writer's completeness report before writing the file.

## Format boundaries

The importer reads four-digit hexadecimal addresses, optionally prefixed by
an overlay name and `::`, followed by contiguous hex bytes and a mnemonic.
Labels occupy their own flush-left lines. Offcut labels carry `; offcut at
hhhh`. Comments and XREF headers have sixteen leading spaces. Boxed plate
comments precede a row; repeatable/post comments follow it. EOL comments
follow the operand after `;`. Uninitialized `??` rows are omitted.

The importer ignores XREF annotations and derives calls from instruction
bytes. The legacy writer's `XREF from` lines print source addresses even for
outgoing references; they are not used as destination evidence. This is an
annotation seed, not a lossless Ghidra project conversion: inspect types and
comment placement after importing. In particular, unboxed PRE and POST
comments share a text layout; use plate comments for leading descriptions
and check any ambiguous unboxed comments against the original project.

## Reproduce the fixture

The committed `../fixtures/ghidra-custom-export.asm` was generated from a
17-byte synthetic program by `CreateImportFixture.java`, which calls the
same exporter. It covers instructions, an offcut operand label, incoming and
outgoing XREFs, byte/word data, plate/EOL/repeatable comments, and uninitialized
memory. It contains no game data.

With Ghidra already installed:

```
python3 kit/scripts/tools.py --platform c64 ghidra-fixture /path/to/ghidra
cmp tools/ghidra-fixture/custom-export.asm kit/c64/fixtures/ghidra-custom-export.asm
python3 -m unittest discover -s kit/c64 -p 'test_*.py'
```

The runner downloads nothing. Its temporary program, project, Java home,
Ghidra settings/cache and logs remain under `tools/ghidra-fixture/`; deleting
that folder removes them. It was exercised on Linux with Java 21. CI tests
the committed text fixture with Python and does not install Ghidra.
