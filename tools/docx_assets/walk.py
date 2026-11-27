import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vis import instances
from PIL import Image
import numpy as np
from scipy import ndimage
M = sys.argv[1]; OUT = sys.argv[2]
SHEETS = {'simcheong': 'image7', 'seondal': 'image10', 'hocheol': 'image13', 'dongmin': 'image16', 'haenim': 'image19', 'dalnim': 'image22'}
import os; os.makedirs(OUT, exist_ok=True)
for key, n in SHEETS.items():
    im = Image.open(f'{M}/{n}.png').convert('RGB')
    W, H = im.size
    lab, ms = instances(im)
    union = np.zeros((H, W), np.float32)
    for i, m in ms: union = np.maximum(union, m)
    fg = union > 0.5
    # keep figures: rows where many columns are fg (drop titles/labels)
    rows = fg.sum(1)
    # split into 10 columns by occupancy
    cols = ndimage.uniform_filter1d(fg.sum(0).astype(float), 5)
    occ = cols > 2
    segs = []; s = None
    for x, v in enumerate(occ):
        if v and s is None: s = x
        if (not v or x == W - 1) and s is not None:
            if x - s > W * 0.02: segs.append([s, x])
            s = None
    # merge/split to get exactly 10 frames: split widest segments at their min-occupancy column
    while len(segs) < 10:
        j = max(range(len(segs)), key=lambda k: segs[k][1] - segs[k][0])
        a, b = segs[j]; w = b - a
        inner = cols[a + w // 4: b - w // 4]; c = a + w // 4 + int(np.argmin(inner))
        segs[j:j + 1] = [[a, c], [c, b]]
    print(key, n, (W, H), len(segs), [b - a for a, b in segs], 'inst', len(ms))
    for k, (a, b) in enumerate(segs[:10]):
        sub = fg[:, a:b]
        lb, nl = ndimage.label(sub)
        if nl == 0: continue
        sizes = ndimage.sum(sub, lb, range(1, nl + 1))
        keep = np.isin(lb, [i + 1 for i, sz in enumerate(sizes) if sz > 0.05 * sizes.max()])
        alpha = np.where(keep, union[:, a:b], 0)
        ys, xs = np.where(alpha > 0.1)
        crop = np.dstack([np.array(im)[:, a:b], (alpha * 255).astype(np.uint8)])
        crop = crop[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        Image.fromarray(crop, 'RGBA').save(f'{OUT}/{key}_w{k}.png')
        open(f'{OUT}/{key}_w{k}.txt', 'w').write(str(int(ys.max())))
