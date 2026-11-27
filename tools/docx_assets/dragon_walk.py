import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vis import instances
from PIL import Image
import numpy as np
from scipy import ndimage
SRC, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
im = Image.open(SRC).convert('RGB'); W, H = im.size
cs = [122, 296, 466, 638, 820, 998, 1166, 1334, 1504, 1672]   # ① … ⑩ label centres
sp = (cs[-1] - cs[0]) / 9
FLOOR = 612                                                    # below this row is the mirrored floor reflection
for k, cx in enumerate(cs):
    a = int(max(0, cx - sp * 1.15)); b = int(min(W, cx + sp * 1.15))
    crop = im.crop((a, 0, b, H)); _, ms = instances(crop)
    m = np.zeros((H, b - a), np.float32)
    for i, mm in ms: m = np.maximum(m, mm)
    m[FLOOR:] = 0
    occ = ndimage.uniform_filter1d((m > 0.5).sum(0).astype(float), 3); c = cx - a
    l0, l1 = int(max(0, c - sp * 0.95)), int(c - sp * 0.25)
    r0, r1 = int(c + sp * 0.25), int(min(b - a, c + sp * 0.95))
    L = l0 + int(np.argmin(occ[l0:l1])) if l1 > l0 else 0
    R = r0 + int(np.argmin(occ[r0:r1])) if r1 > r0 else b - a
    m[:, :L] = 0; m[:, R:] = 0
    lb, nl = ndimage.label(m > 0.3)
    sz = ndimage.sum(m > 0.3, lb, range(1, nl + 1))
    keep = np.isin(lb, [i + 1 for i, s in enumerate(sz) if s > 0.08 * sz.max()])
    m = m * ndimage.binary_dilation(keep, iterations=2)
    ys, xs = np.where(m > 0.1)
    rgba = np.dstack([np.array(crop), (m * 255).astype(np.uint8)])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(rgba, 'RGBA').save(f'{OUT}/simdragon_w{k}.png')
    open(f'{OUT}/simdragon_w{k}.txt', 'w').write(str(int(ys.max())))
    print(k, rgba.shape[:2], int(ys.max()))
