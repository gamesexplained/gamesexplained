"""Local MCP ports, shared by launchers and clients; settings stay in tools/."""
import json
import os
from pathlib import Path

SETTINGS = Path(__file__).resolve().parents[2] / "tools" / "ports.json"


def load_ports(path=None):
    """Read both ports together; a malformed setting must never select a default."""
    path = SETTINGS if path is None else Path(path)
    defaults = {"vice": 6510, "r2000": 3000}
    try:
        settings = json.loads(path.read_text())
    except FileNotFoundError:
        return defaults
    except (OSError, ValueError) as exc:
        raise ValueError(f"cannot read MCP ports from {path}: {exc}") from exc
    if not isinstance(settings, dict) or settings.keys() - defaults.keys():
        raise ValueError(f"{path} must be an object with only vice and r2000 port settings")
    result = defaults | settings
    for name, value in result.items():
        if type(value) is not int or not 1024 <= value <= 65535:
            raise ValueError(f"invalid {name} port in {path}: use an integer from 1024 to 65535")
    if result["vice"] == result["r2000"]:
        raise ValueError(f"vice and r2000 need different ports in {path}")
    return result


def resolve_ports(directory=None, environ=None):
    """Environment, then saved launcher ports, then legacy ports.json, then defaults.

    Reject invalid or colliding settings rather than connect to a different tool.
    Every launcher and client uses this same precedence.
    """
    directory = SETTINGS.parent if directory is None else Path(directory)
    environ = os.environ if environ is None else environ
    result = load_ports(directory / "ports.json")
    for name in result:
        raw = environ.get("KIT_" + name.upper() + "_PORT")
        if raw is None:
            try:
                raw = (directory / (name + "-port")).read_text().strip()
            except FileNotFoundError:
                continue
        try:
            value = int(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"invalid {name} port: {raw!r}") from exc
        if not 1024 <= value <= 65535:
            raise ValueError(f"invalid {name} port: use an integer from 1024 to 65535")
        result[name] = value
    if result["vice"] == result["r2000"]:
        raise ValueError("vice and r2000 need different ports")
    return result


_ports = resolve_ports()
VICE_PORT = _ports["vice"]
R2000_PORT = _ports["r2000"]
