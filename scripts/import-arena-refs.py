#!/usr/bin/env python3
"""REVIEW DAY: take the reference lists and the blessed map and stop content from The Arena, word for word.

Usage:  python3 scripts/import-arena-refs.py <path to a thearena checkout>

What it copies (all already blessed by BK and cleared by Danny for the Arena):
  civic-us11r.json      the Civic Principles card     (docassist-us11r-11.2.json q4_card)
  umbrellas-gs10r.json  the Six Umbrellas and issues  (docassist-gs10r-10.2.json umbrellas + enduring-issues-gs10r.json lines)
  threads-us11r.json    the seven Threads + open stops (threads-us11r.json)
  ei-gs10r.json         the EI lines + open stops      (enduring-issues-gs10r.json)
  atlas-<course>.json   open maps, their walk questions and answers, and the images (atlas-*.json)
Nothing is reworded: fields are copied as they stand; only file paths change. Each output carries the
source file's md5 in _source, so a re-run shows drift.
"""
import hashlib, json, os, shutil, sys
from PIL import Image

src = sys.argv[1]
content = os.path.join(src, 'public', 'content')
out = os.path.join(os.path.dirname(__file__), '..', 'public', 'review-day', 'arena')
os.makedirs(os.path.join(out, 'atlas'), exist_ok=True)

def load(name):
    p = os.path.join(content, name)
    raw = open(p, 'rb').read()
    return json.loads(raw), {'file': f'thearena public/content/{name}', 'md5': hashlib.md5(raw).hexdigest()}

def save(name, obj):
    with open(os.path.join(out, name), 'w') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)

da_us, s1 = load('docassist-us11r-11.2.json')
c = da_us['q4_card']
save('civic-us11r.json', {'_source': [s1], 'title': c['title'],
      'items': [{'n': i['n'], 'name': i['name'], 'group': i.get('group')} for i in c['items']]})

da_gl, s2 = load('docassist-gs10r-10.2.json')
ei, s3 = load('enduring-issues-gs10r.json')
u = da_gl['umbrellas']
subs = {l['number']: [s['name'] for s in l['subs']] for l in ei['lines']}
save('umbrellas-gs10r.json', {'_source': [s2, s3], 'title': u['title'],
      'items': [{'n': i['n'], 'name': i['name'], 'subs': subs.get(int(i['n']), [])} for i in u['items']]})

def stops(d):
    return [{k: s.get(k) for k in ('id', 'unit', 'casefile', 'when', 'title', 'what_happened')} |
            {'on_lines': [{k: o.get(k) for k in ('line', 'sub', 'reason')} for o in s.get('on_lines', [])]}
            for s in d['stops'] if s.get('status', 'open') == 'open']

th, s4 = load('threads-us11r.json')
save('threads-us11r.json', {'_source': [s4],
      'lines': [{k: l.get(k) for k in ('id', 'number', 'name', 'question')} for l in th['lines']],
      'stops': stops(th)})
save('ei-gs10r.json', {'_source': [s3],
      'lines': [{'id': l['id'], 'number': l['number'], 'name': l['name'], 'subs': [{'id': s['id'], 'name': s['name']} for s in l['subs']]} for l in ei['lines']],
      'stops': stops(ei)})

for name, course in (('atlas-us11r.json', 'us11r'), ('atlas-global10r.json', 'gs10r')):
    a, s = load(name)
    maps = []
    for m in a['maps']:
        if m.get('status') != 'open':
            continue
        img_src = os.path.join(src, 'public', m['image'].lstrip('/'))
        dest_rel = f"atlas/{course}-{os.path.basename(m['image'])}"
        shutil.copyfile(img_src, os.path.join(out, dest_rel))
        w, h = Image.open(img_src).size
        steps = [{k: st.get(k) for k in ('tag', 'ask', 'answer', 'focus', 'answer_focus')}
                 for st in m['walk'] if st.get('ask') and st.get('answer')]
        maps.append({'id': m['id'], 'unit': m['unit'], 'title': m['title'], 'image': f'/review-day/arena/{dest_rel}',
                     'width': w, 'height': h, 'image_alt': m['image_alt'], 'source': m['source'], 'steps': steps})
    save(f'atlas-{course}.json', {'_source': [s], 'maps': maps})
print('imported to', os.path.abspath(out))
