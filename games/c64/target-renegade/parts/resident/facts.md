# Shared engine — facts

This part owns the common game engine, music/effects, title/status font and shared sprite components. It uses the cold `work/entry.vsf` at PC $2600, preserving the loader template source in the first-load part before it is copied to low RAM. Runtime actor state, generated screen buffers, mirror caches, sound workspaces and hardware vectors are excluded explicitly.

The engine selects stage resources through $84FE/$A768, draws map columns at $2A6C, dispatches attacks at $A035 and IRQ phases at $AB2F, and publishes sprite pointers through $AD10–$AD15. $FC00 awards lives only above its BCD threshold. Its ledger has zero bare bytes; the canonical listing is rebuilt from the recorded snapshot.

Independent sample results and native verification are recorded in the game-level facts.md. Two samples found details requiring correction; both were settled, and a full audit remains recommended.
