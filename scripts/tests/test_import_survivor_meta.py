import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

MODULE_PATH = Path(__file__).parents[1] / 'import-survivor-meta.py'
spec = importlib.util.spec_from_file_location('import_survivor_meta_module', MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def write_fixture(path: Path, *, manifest_mismatch=False, stage3a_passed=True, stage3b_passed=True, unsafe=False):
    release = '10.2.0-r1'
    strategies = []
    snapshots = []
    manifest = []
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zf:
        if unsafe:
            zf.writestr('../escape.txt', 'nope')
        for i in range(57):
            sid = f'T{i:02d}'
            snap = f'{sid}-10.2.0-r1'
            strategies.append({'id': sid, 'side': 'SURVIVOR', 'parentId': None, 'subtypeIds': []})
            snapshots.append({'snapshotId': snap, 'strategyId': sid})
            used = 'WRONG-SNAPSHOT' if manifest_mismatch and i == 0 else snap
            article = f'strategy-pages/{sid}.md'
            manifest.append({'strategyId': sid, 'snapshotIdUsed': used, 'articleFilename': article})
            zf.writestr(f'{release}/stage3b/{article}', f'---\nstrategyId: {sid}\nsnapshotId: {snap}\n---\n# {sid}\n')
        zf.writestr(f'{release}/stage3a/strategies.json', json.dumps(strategies))
        zf.writestr(f'{release}/stage3a/strategy-snapshots.json', json.dumps(snapshots))
        zf.writestr(f'{release}/stage3a/validation.json', json.dumps({'checks': {'passed': stage3a_passed}}))
        zf.writestr(f'{release}/stage3b/stage3b-qc.json', json.dumps({'passed': stage3b_passed, 'strategyPagesGenerated': 57}))
        zf.writestr(f'{release}/stage3b/strategy-pages-manifest.json', json.dumps(manifest))


class ImportSurvivorMetaTests(unittest.TestCase):
    def test_valid_archive_imports_release(self):
        with tempfile.TemporaryDirectory() as td:
            archive = Path(td) / 'fixture.zip'
            output = Path(td) / 'out'
            write_fixture(archive)
            counts = module.import_survivor_meta(archive, output)
            self.assertEqual(counts, {'strategies': 57, 'snapshots': 57, 'pages': 57})
            self.assertTrue((output / 'stage3a' / 'strategies.json').is_file())
            self.assertTrue((output / 'stage3b' / 'strategy-pages' / 'T00.md').is_file())

    def test_rejects_path_traversal_member(self):
        with tempfile.TemporaryDirectory() as td:
            archive = Path(td) / 'fixture.zip'
            write_fixture(archive, unsafe=True)
            with self.assertRaisesRegex(ValueError, 'unsafe ZIP member'):
                module.import_survivor_meta(archive, Path(td) / 'out')

    def test_rejects_manifest_snapshot_mismatch(self):
        with tempfile.TemporaryDirectory() as td:
            archive = Path(td) / 'fixture.zip'
            write_fixture(archive, manifest_mismatch=True)
            with self.assertRaisesRegex(ValueError, 'manifest snapshotId'):
                module.import_survivor_meta(archive, Path(td) / 'out')

    def test_rejects_failed_stage3a_or_stage3b_qc(self):
        with tempfile.TemporaryDirectory() as td:
            for kwargs, message in [
                ({'stage3a_passed': False}, 'Stage 3A validation did not pass'),
                ({'stage3b_passed': False}, 'Stage 3B QC did not pass'),
            ]:
                archive = Path(td) / ('fixture-' + str(len(message)) + '.zip')
                write_fixture(archive, **kwargs)
                with self.assertRaisesRegex(ValueError, message):
                    module.import_survivor_meta(archive, Path(td) / 'out')


if __name__ == '__main__':
    unittest.main()
