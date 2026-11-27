# Vision foreground instance masks -> numpy
import Vision, Quartz
from Foundation import NSURL
import numpy as np
from PIL import Image
import tempfile, os

def _cg(path):
    src = Quartz.CGImageSourceCreateWithURL(NSURL.fileURLWithPath_(path), None)
    return Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)

def _pb_to_np(pb):
    Quartz.CVPixelBufferLockBaseAddress(pb, 0)
    w = Quartz.CVPixelBufferGetWidth(pb); h = Quartz.CVPixelBufferGetHeight(pb)
    bpr = Quartz.CVPixelBufferGetBytesPerRow(pb)
    base = Quartz.CVPixelBufferGetBaseAddress(pb)
    buf = base.as_buffer(bpr * h)
    a = np.frombuffer(bytes(buf), dtype=np.float32 if bpr >= w * 4 else np.uint8)
    a = a.reshape(h, bpr // a.itemsize)[:, :w].copy()
    Quartz.CVPixelBufferUnlockBaseAddress(pb, 0)
    return a

def instances(img):
    """img: PIL RGB(A). returns (labelmap HxW int, list of per-instance soft masks float 0..1)"""
    tmp = tempfile.mktemp(suffix='.png')
    img.convert('RGB').save(tmp)
    cg = _cg(tmp)
    req = Vision.VNGenerateForegroundInstanceMaskRequest.alloc().init()
    h = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(cg, None)
    ok, err = h.performRequests_error_([req], None)
    os.remove(tmp)
    res = req.results()
    if not res: return None, []
    obs = res[0]
    lab = _pb_to_np(obs.instanceMask()).astype(np.int32)
    masks = []
    for i in obs.allInstances():
        pb, e = obs.generateScaledMaskForImageForInstances_fromRequestHandler_error_(
            __import__('Foundation').NSIndexSet.indexSetWithIndex_(i), h, None)
        masks.append((i, _pb_to_np(pb).astype(np.float32)))
    return lab, masks
