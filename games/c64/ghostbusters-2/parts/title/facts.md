# Title screen facts

The game loads `1.THE INTRO` before the title prompt. The prompt state is captured in `work/entry.vsf`; the opening story follows a further load. The packed file expands to the ranges in `part.json` when the captured decompressor is run over RAM filled with either zeroes or ones. Its 16,098 output bytes differ from the later title snapshot in 99 places, which remain to be attributed. See `../../unpack-map.json`.
