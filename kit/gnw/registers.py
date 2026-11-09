#!/usr/bin/env python3
"""The Game & Watch's registers by name, for the Source tab's operands.

The SM5A reaches its pins by instruction, not by address (KTA, ATR, TW and the rest; kit/skills/
gnw/gnw-reference), so no operand names a register: NAMES is empty. An operand that sets B is
named from the game's labels on the data cells ($1000-$107F) instead.
"""
NAMES = {}
