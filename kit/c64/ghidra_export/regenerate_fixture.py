"""Generate the importer's synthetic text fixture with an installed Ghidra.

Run through tools.py ghidra-fixture <Ghidra installation>.
No downloads; generated program, project, preferences and logs stay in tools/.
"""
import os
from pathlib import Path
import subprocess
import sys


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    install = Path(sys.argv[1]).resolve()
    headless = install / 'support/analyzeHeadless'
    if not headless.is_file():
        sys.exit('installation must contain support/analyzeHeadless')
    scripts = Path(__file__).resolve().parent
    root = scripts.parents[2]
    state = root / 'tools/ghidra-fixture'
    env = dict(os.environ)
    for var, sub in [('XDG_CONFIG_HOME', 'config'), ('XDG_CACHE_HOME', 'cache'),
                     ('XDG_DATA_HOME', 'data'), ('XDG_STATE_HOME', 'state'), ('TMPDIR', 'tmp')]:
        path = state / sub
        path.mkdir(parents=True, exist_ok=True)
        env[var] = str(path)
    # Java's user.home is separate from the shell's HOME. Keep script bundles,
    # Java preferences and Ghidra's fallback paths inside the fixture folder.
    java_home = state / 'java-home'
    java_home.mkdir(exist_ok=True)
    env['JAVA_TOOL_OPTIONS'] = (f'-Duser.home="{java_home}" '
                               f'-Djava.io.tmpdir="{state / "tmp"}"')
    program = state / 'synthetic.bin'
    program.write_bytes(bytes.fromhex('ad0e10200910d0f860ee0e106000070123'))
    output = state / 'custom-export.asm'
    output.unlink(missing_ok=True)
    subprocess.run([str(headless), str(state), 'fixture', '-import', str(program),
                    '-overwrite', '-processor', '6502:LE:16:default',
                    '-loader', 'BinaryLoader', '-loader-baseAddr', '0x1000',
                    '-noanalysis', '-scriptPath', str(scripts),
                    '-postScript', 'CreateImportFixture.java', str(output),
                    '-log', str(state / 'headless.log'),
                    '-scriptlog', str(state / 'script.log')], env=env, cwd=state, check=True)
    if not output.is_file():
        sys.exit('Ghidra did not produce the fixture; read tools/ghidra-fixture/script.log')
    print(f'Fixture ready: {output.relative_to(root)}')


if __name__ == '__main__': main()
