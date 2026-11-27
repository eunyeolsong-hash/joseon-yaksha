import sys, json
from PIL import Image
import numpy as np
SRC, DST = sys.argv[1], sys.argv[2]
def mid(im):
    a = np.array(im)[..., 3].astype(float); h = a.shape[0]
    ys, xs = np.where(a[int(h * 0.22):int(h * 0.58)] > 128)
    return round(float(xs.mean() / a.shape[1]), 3) if len(xs) else 0.5
meta = {}
p1 = Image.open(f'{SRC}/simdragon_p1.png'); f = 360 / p1.height
for i in range(1, 6):
    im = Image.open(f'{SRC}/simdragon_p{i}.png'); im = im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)
    im.save(f'{DST}/simdragon_p{i}.png', optimize=True); meta[f'simdragon_p{i}'] = {'w': im.width, 'h': im.height, 'mid': mid(im)}
N = 9; ground = max(int(open(f'{SRC}/simdragon_w{i}.txt').read()) for i in range(N))
fw = 280 / Image.open(f'{SRC}/simdragon_w0.png').height
for i in range(N):
    im = Image.open(f'{SRC}/simdragon_w{i}.png'); lift = ground - int(open(f'{SRC}/simdragon_w{i}.txt').read())
    pad = Image.new('RGBA', (im.width, im.height + lift)); pad.paste(im, (0, 0)); im = pad
    im = im.resize((round(im.width * fw), round(im.height * fw)), Image.LANCZOS)
    im.save(f'{DST}/simdragon_walk_{i}.png', optimize=True); meta[f'simdragon_walk_{i}'] = {'w': im.width, 'h': im.height, 'mid': mid(im)}
txt = open(f'{DST}/sprite_meta.js', encoding='utf8').read()
head = txt[:txt.index('const SPRITE_META')]
old = json.loads(txt[txt.index('{'):txt.rindex('}') + 1]); old.update(meta)
open(f'{DST}/sprite_meta.js', 'w', encoding='utf8').write(head + 'const SPRITE_META = ' + json.dumps(old, indent=1, sort_keys=True, ensure_ascii=False) + ';\n')
print(len(meta), 'sprites')
