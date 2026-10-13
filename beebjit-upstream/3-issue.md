## What we'd like

`stats` counts how many times each address runs. That's just what we need to map which bytes of a game are code. But `ds` prints only the 256 busiest addresses, and a boot to the BASIC prompt alone runs 1,904.

## How to see it

```
./beebjit -headless -fast -debug -commands "stats;breakat 2000000;c;ds;q"
```

This lists 256 addresses under `=== Addrs ===`.

## The suggestion

A `savecounts <file>` command that writes every address with a count, one per line in address order, as `ADDR: count`: four hex digits, then the count in decimal. A pull request with this follows.
