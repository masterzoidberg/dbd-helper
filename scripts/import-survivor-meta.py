#!/usr/bin/env python3
import argparse
import json
import re
import shutil
import zipfile
from pathlib import Path, PurePosixPath

DEFAULT_RELEASE = '10.2.0-r1'
EXPECTED_COUNT = 57


def _safe_member(name: str) -> None:
    normalized = name.replace('\\', '/')
    p = PurePosixPath(normalized)
    if normalized.startswith('/') or p.is_absolute() or '..' in p.parts:
        raise ValueError(f'unsafe ZIP member: {name}')


def _read_json(zf: zipfile.ZipFile, name: str):
    try:
        return json.loads(zf.read(name).decode('utf-8'))
    except KeyError as exc:
        raise ValueError(f'missing required archive member: {name}') from exc
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f'invalid JSON in {name}: {exc}') from exc


def _front_matter(markdown: str) -> dict[str, str]:
    lines = markdown.splitlines()
    if not lines or lines[0].strip() != '---':
        raise ValueError('article missing YAML-style front matter')
    values = {}
    for line in lines[1:]:
        if line.strip() == '---':
            return values
        if ':' not in line:
            continue
        key, value = line.split(':', 1)
        value = value.strip()
        if value.startswith('"') and value.endswith('"'):
            value = value[1:-1]
        values[key.strip()] = value
    raise ValueError('article front matter is not terminated')


def _validate(zf: zipfile.ZipFile, release: str) -> tuple[list, list, list]:
    for info in zf.infolist():
        _safe_member(info.filename)

    base = f'{release}/'
    stage3a = base + 'stage3a/'
    stage3b = base + 'stage3b/'
    strategies = _read_json(zf, stage3a + 'strategies.json')
    snapshots = _read_json(zf, stage3a + 'strategy-snapshots.json')
    validation = _read_json(zf, stage3a + 'validation.json')
    qc = _read_json(zf, stage3b + 'stage3b-qc.json')
    manifest = _read_json(zf, stage3b + 'strategy-pages-manifest.json')

    if validation.get('checks', {}).get('passed') is not True:
        raise ValueError('Stage 3A validation did not pass')
    if qc.get('passed') is not True:
        raise ValueError('Stage 3B QC did not pass')
    if not isinstance(strategies, list) or len(strategies) != EXPECTED_COUNT:
        raise ValueError(f'expected {EXPECTED_COUNT} strategies, found {len(strategies) if isinstance(strategies, list) else "non-list"}')
    if not isinstance(snapshots, list) or len(snapshots) != EXPECTED_COUNT:
        raise ValueError(f'expected {EXPECTED_COUNT} snapshots, found {len(snapshots) if isinstance(snapshots, list) else "non-list"}')
    if not isinstance(manifest, list) or len(manifest) != EXPECTED_COUNT:
        raise ValueError(f'expected {EXPECTED_COUNT} Stage 3B pages, found {len(manifest) if isinstance(manifest, list) else "non-list"}')
    if qc.get('strategyPagesGenerated') != EXPECTED_COUNT:
        raise ValueError('Stage 3B QC page count does not equal 57')

    strategy_ids = [s.get('id') for s in strategies]
    if any(not isinstance(i, str) or not i for i in strategy_ids) or len(set(strategy_ids)) != EXPECTED_COUNT:
        raise ValueError('Strategy IDs must be 57 unique non-empty strings')
    by_id = {s['id']: s for s in strategies}
    if any(s.get('side') != 'SURVIVOR' for s in strategies):
        raise ValueError('all canonical strategies must have side SURVIVOR')

    for s in strategies:
        parent = s.get('parentId')
        if parent is not None and parent not in by_id:
            raise ValueError(f'{s["id"]}: unresolved parentId {parent}')
        for child in s.get('subtypeIds') or []:
            if child not in by_id:
                raise ValueError(f'{s["id"]}: unresolved subtypeId {child}')

    snapshot_ids = [s.get('snapshotId') for s in snapshots]
    if any(not isinstance(i, str) or not i for i in snapshot_ids) or len(set(snapshot_ids)) != EXPECTED_COUNT:
        raise ValueError('snapshot IDs must be 57 unique non-empty strings')
    snapshot_by_strategy = {}
    snapshot_by_id = {}
    for snap in snapshots:
        sid = snap.get('strategyId')
        if sid not in by_id:
            raise ValueError(f'unresolved snapshot strategyId {sid}')
        if sid in snapshot_by_strategy:
            raise ValueError(f'multiple snapshots for strategy {sid}')
        snapshot_by_strategy[sid] = snap
        snapshot_by_id[snap['snapshotId']] = snap
    if set(snapshot_by_strategy) != set(by_id):
        raise ValueError('every Strategy must have exactly one current snapshot')

    manifest_ids = [m.get('strategyId') for m in manifest]
    if len(set(manifest_ids)) != EXPECTED_COUNT or set(manifest_ids) != set(by_id):
        raise ValueError('Stage 3B manifest must cover each Strategy exactly once')

    for item in manifest:
        sid = item.get('strategyId')
        expected_snapshot = snapshot_by_strategy[sid]['snapshotId']
        if item.get('snapshotIdUsed') != expected_snapshot:
            raise ValueError(f'{sid}: manifest snapshotId {item.get("snapshotIdUsed")} does not match {expected_snapshot}')
        article_rel = item.get('articleFilename')
        if not isinstance(article_rel, str) or not article_rel.startswith('strategy-pages/'):
            raise ValueError(f'{sid}: invalid articleFilename')
        article_name = stage3b + article_rel
        try:
            markdown = zf.read(article_name).decode('utf-8')
        except KeyError as exc:
            raise ValueError(f'{sid}: missing article {article_rel}') from exc
        meta = _front_matter(markdown)
        if meta.get('strategyId') != sid:
            raise ValueError(f'{sid}: article strategyId mismatch')
        if meta.get('snapshotId') != expected_snapshot:
            raise ValueError(f'{sid}: article snapshotId mismatch')

    return strategies, snapshots, manifest


def import_survivor_meta(
    archive: Path,
    output: Path,
    release: str = DEFAULT_RELEASE,
) -> dict[str, int]:
    archive = Path(archive)
    output = Path(output)
    if not archive.is_file():
        raise ValueError(f'missing archive: {archive}')
    try:
        with zipfile.ZipFile(archive, 'r') as zf:
            bad = zf.testzip()
            if bad:
                raise ValueError(f'corrupt ZIP member: {bad}')
            strategies, snapshots, manifest = _validate(zf, release)
            selected_prefixes = (f'{release}/stage3a/', f'{release}/stage3b/')
            selected = [
                info for info in zf.infolist()
                if not info.is_dir() and info.filename.startswith(selected_prefixes)
            ]
            if output.exists():
                shutil.rmtree(output)
            output.mkdir(parents=True, exist_ok=True)
            for info in selected:
                rel = PurePosixPath(info.filename).relative_to(release)
                target = output.joinpath(*rel.parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(zf.read(info.filename))
    except zipfile.BadZipFile as exc:
        raise ValueError(f'corrupt ZIP archive: {archive}') from exc

    return {'strategies': len(strategies), 'snapshots': len(snapshots), 'pages': len(manifest)}


def main() -> None:
    ap = argparse.ArgumentParser(description='Validate and import frozen Survivor Meta research')
    ap.add_argument('--archive', default='survivor-meta.zip')
    ap.add_argument('--output', default=f'content/survivor/meta/{DEFAULT_RELEASE}')
    ap.add_argument('--release', default=DEFAULT_RELEASE)
    args = ap.parse_args()
    counts = import_survivor_meta(Path(args.archive), Path(args.output), args.release)
    print(f'Imported Survivor Meta {args.release}: {counts["strategies"]} strategies, {counts["snapshots"]} snapshots, {counts["pages"]} pages')


if __name__ == '__main__':
    main()
