import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vis import instances
from PIL import Image
import numpy as np
from scipy import ndimage
M = sys.argv[1]; OUT = sys.argv[2]
n, pw, xs = 'image19', 760, [52,128,205,277,348,419,491,565,640,714]
im = Image.open(f'{M}/{n}.png').convert('RGB'); W, H = im.size
sc = W / pw; cs = [x * sc for x in xs]; sp = (cs[-1] - cs[0]) / 9
lab, ms = instances(im)
union = np.zeros((H, W), np.float32)
for i, m in ms: union = np.maximum(union, m)
# second pass per slot crop for better masks
for k, cx in enumerate(cs):
    a = int(max(0, cx - sp * 1.1)); b = int(min(W, cx + sp * 1.1))
    crop = im.crop((a, 0, b, H)); _, ms2 = instances(crop)
    m = np.zeros((H, b - a), np.float32)
    for i, mm in ms2: m = np.maximum(m, mm)
    occ = ndimage.uniform_filter1d((m > 0.5).sum(0).astype(float), 3)
    c = cx - a
    l0, l1 = int(max(0, c - sp * 0.95)), int(c - sp * 0.3)
    r0, r1 = int(c + sp * 0.3), int(min(b - a, c + sp * 0.95))
    L = l0 + int(np.argmin(occ[l0:l1])) if k > 0 else 0
    R = r0 + int(np.argmin(occ[r0:r1])) if k < 9 else b - a
    m[:, :L] = 0; m[:, R:] = 0
    lb, nl = ndimage.label(m > 0.3)
    sizes = ndimage.sum(m > 0.3, lb, range(1, nl + 1))
    keep = np.isin(lb, [i + 1 for i, s in enumerate(sizes) if s > 0.08 * sizes.max()])
    m = m * ndimage.binary_dilation(keep, iterations=2)
    ys, xx = np.where(m > 0.1)
    rgba = np.dstack([np.array(crop), (m * 255).astype(np.uint8)])[ys.min():ys.max() + 1, xx.min():xx.max() + 1]
    Image.fromarray(rgba, 'RGBA').save(f'{OUT}/haenim_w{k}.png')
    open(f'{OUT}/haenim_w{k}.txt', 'w').write(str(int(ys.max())))
