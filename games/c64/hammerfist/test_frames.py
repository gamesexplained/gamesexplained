"""Check the exact video data embedded in both pages against VICE screenshots."""
import json, pathlib, re, sys, tempfile
ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'kit/c64'))
import frame
HERE = pathlib.Path(__file__).resolve().parent
for page, element, picture in [('index.html','hf-frame-data','paused-frame.png'),('graphics.html','hf-loading-data','loading.png')]:
    match = re.search(r'<script type="application/json" id="'+element+r'">(.*?)</script>', (HERE/page).read_text(), re.S)
    assert match, element
    with tempfile.TemporaryDirectory() as directory:
        target = pathlib.Path(directory)/'frame.json'
        target.write_text(match[1])
        assert frame.compare(str(target), str(HERE/'reference'/picture), quiet=True) == 0, page
    print(page+': 104448/104448 pixels match VICE')
