import sys, os
from PIL import Image
import numpy as np
from scipy import ndimage
M = sys.argv[1]; OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)

def dechecker(a):
    rgb = a[..., :3].astype(int); mn = rgb.min(2); mx = rgb.max(2)
    cand = (mn > 205) & (mx - mn < 14)
    lb, nl = ndimage.label(cand)
    bg = np.zeros(cand.shape, bool)
    H, W = cand.shape
    border = set(np.unique(np.concatenate([lb[0], lb[-1], lb[:, 0], lb[:, -1]]))) - {0}
    objs = ndimage.find_objects(lb)
    for i, sl in enumerate(objs, 1):
        reg = lb[sl] == i; area = reg.sum()
        v = mn[sl][reg]
        hi = (v > 245).mean(); lo = ((v > 205) & (v < 240)).mean()
        if i in border or (area > 150 and hi > 0.15 and lo > 0.15):
            bg[sl] |= reg
    # soften edge: 1px erode of fg alpha
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    alpha = ndimage.grey_erosion(alpha, size=2)
    a = a.copy(); a[..., 3] = alpha
    return a

def split(key, n, cuts, pre=None):
    a = np.array(Image.open(f'{M}/{n}.png').convert('RGBA'))
    if pre: a = pre(a)
    W = a.shape[1]; edges = [0] + cuts + [W]
    for k in range(len(edges) - 1):
        p = a[:, edges[k]:edges[k + 1]].copy()
        al = p[..., 3]
        grp = ndimage.binary_dilation(al > 16, iterations=3)
        lb, nl = ndimage.label(grp)
        sizes = ndimage.sum(al > 16, lb, range(1, nl + 1))
        keep = np.isin(lb, [i + 1 for i, s in enumerate(sizes) if s > 0.03 * sizes.max()])
        p[..., 3] = np.where(keep, al, 0)
        ys, xs = np.where(p[..., 3] > 8)
        p = p[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        Image.fromarray(p, 'RGBA').save(f'{OUT}/{key}_p{k + 1}.png')
        print(key, k + 1, p.shape[:2])

def sc(xs, s, off=0): return [int((x - off) * s) for x in xs]
split('seondal', 'image9', sc([213, 404, 597, 860], 2048 / 1140))
split('hocheol', 'image12', [307, 603, 961, 1367])
split('dongmin', 'image15', sc([230, 472, 715, 1042], 2048 / 1600), pre=dechecker)
split('haenim', 'image18', sc([123, 245, 385, 550], 1774 / 758))
split('dalnim', 'image21', sc([134, 235, 352, 548], 1774 / 758))
for i in range(5):
    a = np.array(Image.open(f'{M}/image{2 + i}.png').convert('RGBA'))
    ys, xs = np.where(a[..., 3] > 8); a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(a, 'RGBA').save(f'{OUT}/simcheong_p{i + 1}.png')
# full-body portraits
for key, n in {'simcheong': 'image1', 'seondal': 'image8', 'hocheol': 'image11', 'dongmin': 'image14', 'haenim': 'image17', 'dalnim': 'image20'}.items():
    a = np.array(Image.open(f'{M}/{n}.png').convert('RGBA'))
    ys, xs = np.where(a[..., 3] > 8); a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(a, 'RGBA').save(f'{OUT}/{key}_bust.png')
