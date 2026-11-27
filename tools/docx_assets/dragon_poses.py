import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vis import instances
from PIL import Image
import numpy as np
from scipy import ndimage
SRC, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
im = Image.open(SRC).convert('RGB'); a = np.array(im).astype(np.float32); H, W = a.shape[:2]
lab, ms = instances(im)
body = np.zeros((H, W), np.float32)
for i, m in ms: body = np.maximum(body, m)
mx = a.max(2)
glow = np.clip((mx - 14) / 90, 0, 1)                    # black background → glow/effects keep soft alpha
dark = np.clip((mx - 20) / 35, 0, 1)            # pure-black background inside the soft body mask → transparent
alpha = np.maximum(body * dark, glow)
# un-premultiply glow pixels (they were drawn over black) so edges don't go grey
k = np.where(body < 0.5, np.maximum(alpha, 1e-3), 1)[..., None]
rgb = np.clip(a / k, 0, 255)
occ = ndimage.uniform_filter1d((body > 0.5).sum(0).astype(float), 9)
def cut(lo, hi): return lo + int(np.argmin(occ[lo:hi]))
c1, c2, c4 = cut(270, 330), cut(530, 610), cut(1190, 1230)
c3 = cut(830, 890)
print('cuts', c1, c2, c3, c4)
# pose 4 owns the dragon + lotus above pose 3's head: above y=360 the 3|4 boundary moves left
region = np.zeros((H, W), np.int32)
xx = np.arange(W)[None, :]; yy = np.arange(H)[:, None]
b34 = np.where(yy < 210, 800, c3)
region = (xx >= c1).astype(int) + (xx >= c2) + (xx >= b34) + (xx >= c4)
for k_ in range(5):
    m = (region == k_) & (alpha > 0.03)
    lb, nl = ndimage.label(ndimage.binary_dilation(m, iterations=2))
    sizes = ndimage.sum(m, lb, range(1, nl + 1))
    # pieces of a neighbouring pose (body mask components touching the cut line) and their glow are removed
    bm = (region == k_) & (body > 0.5)
    blb, bn = ndimage.label(bm)
    bs = ndimage.sum(bm, blb, range(1, bn + 1))
    cols = np.where((region == k_).any(0))[0]; lo, hi = cols.min(), cols.max()
    bad = np.zeros_like(bm)
    for i, s_ in enumerate(bs):
        comp = blb == i + 1; cx = np.where(comp.any(0))[0]
        if s_ < 0.3 * bs.max() and (cx.min() <= lo + 2 or cx.max() >= hi - 2): bad |= comp
    good = bm & ~bad
    near_bad = ndimage.binary_dilation(bad, iterations=30) & ~ndimage.binary_dilation(good, iterations=12)
    keep = m & ~near_bad & ~bad
    al = np.where(keep, alpha, 0)
    ys, xs = np.where(al > 0.05)
    rgba = np.dstack([rgb, al * 255]).astype(np.uint8)[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(rgba, 'RGBA').save(f'{OUT}/simdragon_p{k_ + 1}.png'); print(k_ + 1, rgba.shape[:2])
