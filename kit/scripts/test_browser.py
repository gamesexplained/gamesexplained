"""Shared browser containment and dispatch, without a Firefox dependency."""
import importlib.util
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import browser
spec = importlib.util.spec_from_file_location('shared_tools', Path(__file__).with_name('tools.py'))
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class BrowserTests(unittest.TestCase):
    def test_stop_pattern_uses_posix_extended_regex(self):
        if not shutil.which('grep'):
            self.skipTest('grep is needed to check the pkill regex dialect')
        with patch.object(browser, 'CHROMIUM_STATE', Path('/tmp/kit/tools/chromium')):
            owned = '/usr/bin/chrome --headless --user-data-dir=/tmp/kit/tools/chromium/profile --remote-debugging-port=9222 about:blank'
            pattern = browser.stop_pattern()
            for command, expected in [(owned, 0), (owned.replace('/tmp/kit/', '/tmp/other/'), 1)]:
                result = subprocess.run(['grep', '-E', '--', pattern], input=command + '\n', text=True, capture_output=True)
                self.assertEqual(result.returncode, expected, result.stderr)

    def test_profile_and_environment_are_local(self):
        with tempfile.TemporaryDirectory() as folder:
            state = Path(folder) / 'firefox'
            with patch.object(browser, 'STATE', state), patch.object(browser, 'LOG', Path(folder)/'firefox.log'), patch.object(browser.shutil, 'which', return_value='/usr/bin/firefox'), patch.object(browser, 'up', side_effect=[False, True]), patch.object(browser.subprocess, 'Popen') as start:
                browser.start()
                args, kw = start.call_args
                command = args[0]
                self.assertEqual(command[command.index('--profile') + 1], str(state/'profile'))
                for name in ['XDG_CONFIG_HOME', 'XDG_STATE_HOME', 'XDG_CACHE_HOME', 'XDG_DATA_HOME', 'TMPDIR']:
                    self.assertTrue(Path(kw['env'][name]).is_relative_to(state))
                self.assertEqual(kw['cwd'], state)
                self.assertIn('--no-remote', command)
                self.assertEqual(kw['env']['MOZ_CRASHREPORTER_DISABLE'], '1')

    def test_explicit_chromium_uses_contained_profile(self):
        with tempfile.TemporaryDirectory() as folder:
            exe = Path(folder) / 'chrome'
            exe.touch()
            state = Path(folder) / 'state'
            with patch.dict(browser.os.environ, {'KIT_BROWSER_CHROMIUM': str(exe)}), patch.object(browser, 'CHROMIUM_STATE', state), patch.object(browser, 'LOG', Path(folder)/'browser.log'), patch.object(browser, 'up', side_effect=[False, True]), patch.object(browser.subprocess, 'Popen') as start:
                browser.start()
                command = start.call_args.args[0]
                self.assertIn('--user-data-dir=' + str(state/'profile'), command)
                self.assertIn('--no-first-run', command)
                self.assertEqual(start.call_args.kwargs['cwd'], state)
                for name in ['XDG_CONFIG_HOME', 'XDG_STATE_HOME', 'XDG_CACHE_HOME', 'XDG_DATA_HOME', 'TMPDIR']:
                    self.assertTrue(Path(start.call_args.kwargs['env'][name]).is_relative_to(state))

    def test_chromium_stop_does_not_match_another_profile(self):
        with patch.object(browser, 'CHROMIUM_STATE', Path('/tmp/kit/tools/chromium')):
            owned = '/usr/bin/chrome --headless --user-data-dir=/tmp/kit/tools/chromium/profile --remote-debugging-port=9222 --no-first-run'
            self.assertRegex(owned, browser.stop_pattern())
            for foreign in (owned.replace('/tmp/kit/', '/tmp/other/'), owned.replace('/profile ', '/profile-other '), '/bin/sh -c ' + owned):
                self.assertIsNone(re.search(browser.stop_pattern(), foreign))

    def test_occupied_port_does_not_start_another_browser(self):
        with patch.object(browser.shutil, 'which', return_value='/usr/bin/firefox'), patch.object(browser, 'up', return_value=True), patch.object(browser.subprocess, 'Popen') as start:
            with self.assertRaises(SystemExit): browser.start()
            start.assert_not_called()

    def test_missing_browser_does_not_download(self):
        with patch.object(browser.shutil, 'which', return_value=None), patch.object(browser.subprocess, 'Popen') as start:
            with self.assertRaisesRegex(SystemExit, 'no installed Firefox'): browser.start()
            start.assert_not_called()

    def test_stop_matches_only_this_clones_browser(self):
        with patch.object(browser, 'STATE', Path('/tmp/kit [test]/tools/firefox')), patch.object(browser.subprocess, 'run') as run:
            run.side_effect = [SimpleNamespace(returncode=0), SimpleNamespace(returncode=1)]
            browser.stop()
            command = run.call_args_list[0].args[0]
            self.assertEqual(command[:3], ['pkill', '-f', '--'])
            owned = '/usr/lib/firefox/firefox --headless --no-remote --profile /tmp/kit [test]/tools/firefox/profile --remote-debugging-port 9222 about:blank'
            self.assertRegex(owned, command[3])
            for foreign in (owned.replace('profile --', 'profile-other --'),
                            owned.replace('kit [test]', 'other clone'),
                            '/usr/bin/firefox -P personal',
                            '/bin/sh -c ' + owned):
                self.assertIsNone(re.search(command[3], foreign), foreign)

    def test_shared_commands_need_no_platform(self):
        with patch.object(launcher, 'platforms', return_value=['c64', 'future']), patch.object(launcher.runpy, 'run_path') as platform, patch.object(browser, 'start') as start, patch.object(browser, 'stop') as stop:
            for args in (['browser'], ['--platform', 'future', 'browser'], ['stop', 'browser']):
                with patch.object(sys, 'argv', ['tools.py', *args]): launcher.main()
            self.assertEqual(start.call_count, 2)
            stop.assert_called_once()
            platform.assert_not_called()

    def test_all_platform_status_and_stop_include_browser_once(self):
        declarations = {'COMMANDS': ('status', 'stop'), 'TOOL_NAMES': ()}
        with patch.object(launcher, 'platforms', return_value=['c64', 'future']), patch.object(launcher, 'declared', return_value=declarations), patch.object(launcher.os, 'getcwd', return_value='/tmp'), patch.dict(launcher.os.environ, {}, clear=True), patch.object(launcher.subprocess, 'run', return_value=SimpleNamespace(returncode=0)) as platform, patch.object(browser, 'status') as status, patch.object(browser, 'stop') as stop:
            for args in (['status'], ['stop', 'all']):
                with patch.object(sys, 'argv', ['tools.py', *args]), self.assertRaises(SystemExit) as result:
                    launcher.main()
                self.assertEqual(result.exception.code, 0)
            status.assert_called_once()
            stop.assert_called_once()
            self.assertEqual(platform.call_count, 4)

    def test_platform_status_and_stop_include_browser(self):
        with patch.object(launcher, 'platforms', return_value=['c64']), patch.dict(launcher.os.environ, {'KIT_PLATFORM': 'c64'}), patch.object(launcher.runpy, 'run_path') as platform, patch.object(browser, 'status') as status, patch.object(browser, 'stop') as stop:
            for args in (['status'], ['stop'], ['stop', 'all', '--force']):
                with patch.object(sys, 'argv', ['tools.py', *args]): launcher.main()
            status.assert_called_once()
            self.assertEqual(stop.call_count, 2)
            self.assertEqual(platform.call_count, 3)


if __name__ == '__main__': unittest.main()
