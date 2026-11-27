import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vis import instances
from PIL import Image
import numpy as np
M = sys.argv[1]; OUT = sys.argv[2]
# label centres measured on the previews (preview px, preview width)
SLOTS = {
 'simcheong': ('image7', 1140, [90,200,316,425,533,643,752,858,973,1082]),
 'haenim': ('image19', 760, [52,128,205,277,348,419,491,565,640,714]),
 'dalnim': ('image22', 760, [50,124,199,272,345,419,492,566,640,714]),
}
for key, (n, pw, xs) in SLOTS.items():
    im = Image.open(f'{M}/{n}.png').convert('RGB'); W, H = im.size
    sc = W / pw; cs = [x * sc for x in xs]; sp = (cs[-1] - cs[0]) / 9
    for k, cx in enumerate(cs):
        a = int(max(0, cx - sp * 1.1)); b = int(min(W, cx + sp * 1.1))
        crop = im.crop((a, 0, b, H))
        lab, ms = instances(crop)
        best = None
        for i, m in ms:
            ys, xx = np.where(m > 0.5)
            if len(xx) < 500: continue
            d = abs(xx.mean() - (cx - a))
            if best is None or d < best[0]: best = (d, m)
        m = best[1]
        ys, xx = np.where(m > 0.1)
        rgba = np.dstack([np.array(crop), (m * 255).astype(np.uint8)])[ys.min():ys.max() + 1, xx.min():xx.max() + 1]
        Image.fromarray(rgba, 'RGBA').save(f'{OUT}/{key}_w{k}.png')
        open(f'{OUT}/{key}_w{k}.txt', 'w').write(str(int(ys.max())))
        print(key, k, rgba.shape[:2], len(ms))
