"""Per-clone MCP ports; optional tools/mcp-ports.json stays out of git."""
import json
from pathlib import Path

CONFIG = Path(__file__).resolve().parents[2] / "tools" / "mcp-ports.json"


def ports():
    values = {"vice": 6510, "r2000": 3000}
    if CONFIG.exists():
        custom = json.loads(CONFIG.read_text())
        if not isinstance(custom, dict) or set(custom) - set(values):
            raise ValueError("tools/mcp-ports.json accepts only vice and r2000 ports")
        values.update(custom)
    if any(type(p) is not int or not 1024 <= p <= 65535 for p in values.values()):
        raise ValueError("MCP ports must be integers between 1024 and 65535")
    if len(set(values.values())) != len(values):
        raise ValueError("Emulator and disassembler need different ports")
    return values


PORTS = ports()
VICE_PORT, R2000_PORT = PORTS["vice"], PORTS["r2000"]
