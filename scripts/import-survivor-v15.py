#!/usr/bin/env python3
import argparse
import json
import shutil
import zipfile
from pathlib import Path


def load_json(zf, suffix):
    names = [n for n in zf.namelist() if n.endswith('/' + suffix) or n == suffix]
    if len(names) != 1:
        raise SystemExit(f'Expected exactly one {suffix} in archive; found {names}')
    return json.loads(zf.read(names[0]).decode('utf-8'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--archive', default='dbd-local-data-v15-release-candidate.zip')
    ap.add_argument('--output', default='content/survivor/perks')
    args = ap.parse_args()
    archive = Path(args.archive)
    out = Path(args.output)
    if not archive.exists():
        raise SystemExit(f'Missing archive: {archive}')

    with zipfile.ZipFile(archive) as zf:
        mechanics = load_json(zf, 'survivor-mechanics.json')
        editorial = load_json(zf, 'survivor-editorial.json')

    mechanics_by_id = {p['slug']: p for p in mechanics['perks']}
    editorial_perks = sorted(editorial['perks'], key=lambda p: p['rank'])
    if len(mechanics_by_id) != 176 or len(editorial_perks) != 176:
        raise SystemExit(f'Expected 176 mechanics/editorial records; found {len(mechanics_by_id)}/{len(editorial_perks)}')
    if set(mechanics_by_id) != {p['id'] for p in editorial_perks}:
        raise SystemExit('Mechanics/editorial ID sets differ')
    if [p['rank'] for p in editorial_perks] != list(range(1, 177)):
        raise SystemExit('Editorial ranks are not contiguous 1-176')

    name_by_id = {slug: perk['name'] for slug, perk in mechanics_by_id.items()}
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    for editorial_source in editorial_perks:
        editorial_record = json.loads(json.dumps(editorial_source))
        slug = editorial_record['id']
        mechanic = mechanics_by_id[slug]
        rank = editorial_record['rank']
        batch_start = ((rank - 1) // 5) * 5 + 1
        batch = f'{batch_start:03d}-{batch_start + 4:03d}'

        source = 'General perk' if mechanic['is_general_perk'] else mechanic['source_character']
        alternate_name = None
        if slug == 'will-to-live':
            alternate_name = 'Decisive Strike'
            source = 'General perk / Laurie Strode licensed display'

        activation = list(mechanic.get('activation_requirements') or [])
        activation += [f'Ends/deactivates when: {item}' for item in (mechanic.get('deactivation_conditions') or [])]
        latest_change = mechanic.get('latest_known_live_balance_change') or {}
        patch_note = (
            f"Latest live balance change ({latest_change.get('patch') or 'unknown'}): "
            f"{latest_change.get('change') or 'No material live balance change recorded.'}"
        )

        mechanics_record = {
            'name': mechanic['name'],
            'alternateName': alternate_name,
            'source': source,
            'status': f"Live {mechanics['verified_live_patch']}",
            'currentEffect': mechanic['current_effect'],
            'activation': activation,
            'patchNote': patch_note,
            'plainEnglishSummary': mechanic.get('plain_english_summary'),
            'cooldown': mechanic.get('cooldown'),
            'duration': mechanic.get('duration') or [],
            'tokenOrStackBehavior': mechanic.get('token_or_stack_behavior'),
            'oncePerTrialOrOtherLimits': mechanic.get('once_per_trial_or_other_limits'),
            'statusEffectsInvolved': mechanic.get('status_effects_involved') or [],
            'specialInteractions': mechanic.get('special_interactions') or [],
            'sourceCharacter': mechanic.get('source_character'),
            'isGeneralPerk': bool(mechanic.get('is_general_perk')),
            'currentLivePatchVerified': mechanic.get('current_live_patch_verified')
        }

        editorial_record['publicationStatus'] = 'published'
        editorial_record['synergies'] = [
            name_by_id[perk_id]
            for perk_id in editorial_record.get('synergyPerkIds', [])
            if perk_id in name_by_id
        ] + list(editorial_record.get('synergyOther', []) or [])
        editorial_record['antiSynergies'] = [
            name_by_id[perk_id]
            for perk_id in editorial_record.get('antiSynergyPerkIds', [])
            if perk_id in name_by_id
        ]

        record = {
            'schemaVersion': 2,
            'batch': batch,
            'verifiedLivePatch': mechanics['verified_live_patch'],
            'verifiedDate': mechanics['verified_date'],
            'id': slug,
            'mechanics': mechanics_record,
            'editorial': editorial_record
        }
        folder = out / batch
        folder.mkdir(exist_ok=True)
        path = folder / f'{rank:03d}-{slug}.json'
        path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    files = list(out.glob('*/*.json'))
    if len(files) != 176:
        raise SystemExit(f'Import wrote {len(files)} files instead of 176')
    print(f'Imported {len(files)} Survivor perks from {archive}')


if __name__ == '__main__':
    main()
