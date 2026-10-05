from pathlib import Path
import argparse
from PIL import Image
import numpy as np

parser = argparse.ArgumentParser(description='Rebuild Chess Horizon theme boards and sprites from supplied references.')
parser.add_argument('--source-dir', type=Path, required=True, help='Project-file directory containing the six named references.')
parser.add_argument('--project-file-dir', type=Path, required=True, help='Project-file directory containing photo-output-2.png.')
parser.add_argument('--out-dir', type=Path, default=Path('public'), help='Production asset root (default: public).')
args = parser.parse_args()

ROOT=args.source_dir
PROJECT=args.project_file_dir
OUT=args.out_dir
OUT.mkdir(parents=True, exist_ok=True)

# Grid bounds are measured from the supplied full-board reference images.
REFS={
 'horizon': (ROOT/'48147519-DA9B-4DB0-9758-5438C05301A8.jpeg',(44,48,2005,1996),28),
 'gatsby': (ROOT/'photo-output.png',(126,111,1934,1938),32),
 'emerald': (ROOT/'IMG_1784.JPG',(61,59,1349,1340),30),
 'terracotta': (ROOT/'IMG_1782.JPG',(90,77,1317,1340),30),
 'glacier': (ROOT/'IMG_1783.JPG',(73,66,1336,1336),26),
 'plum': (ROOT/'IMG_1785.JPG',(52,52,1352,1363),28),
 'crimson': (PROJECT/'photo-output-2.png',(75,73,1973,1974),32),
}
PIECE_ORDER=['r','n','b','q','k','b','n','r']

def resized_patch(a,x0,y0,x1,y1,w,h):
    im=Image.fromarray(np.uint8(np.clip(a[y0:y1,x0:x1],0,255)),'RGB')
    return np.asarray(im.resize((w,h),Image.Resampling.LANCZOS)).astype(np.float32)

def connected_keep(mask):
    # Keep foreground components that touch the central 90% of the square.
    h,w=mask.shape
    seen=np.zeros_like(mask,bool); comps=[]
    for y,x in zip(*np.where(mask & ~seen)):
        if seen[y,x]: continue
        stack=[(int(y),int(x))]; seen[y,x]=1; pts=[]; touch=False
        while stack:
            yy,xx=stack.pop(); pts.append((yy,xx))
            if (0.04*h <= yy < 0.96*h and 0.04*w <= xx < 0.96*w): touch=True
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny,nx=yy+dy,xx+dx
                if 0<=ny<h and 0<=nx<w and mask[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=1; stack.append((ny,nx))
        if touch: comps.append(pts)
    # Retain all meaningful components; small compression specks are discarded.
    out=np.zeros_like(mask)
    for pts in comps:
        if len(pts)>=80:
            ys=[p[0] for p in pts]; xs=[p[1] for p in pts]
            box_h=max(ys)-min(ys)+1; box_w=max(xs)-min(xs)+1
            # Horizontal/vertical board rules can be wide but very thin;
            # keep the actual piece body while rejecting those rules.
            if not ((box_w > 0.60*w and box_h < 0.12*h) or
                    (box_h > 0.60*h and box_w < 0.12*w)):
                for y,x in pts: out[y,x]=1
    return out

def process(theme, path, bounds, threshold):
    src=Image.open(path).convert('RGB')
    a=np.asarray(src).astype(np.float32); H,W=a.shape[:2]
    gx0,gy0,gx1,gy1=bounds
    xs=np.round(np.linspace(gx0,gx1,9)).astype(int)
    ys=np.round(np.linspace(gy0,gy1,9)).astype(int)
    bw=256; bh=256
    board=a.copy()
    piece_dir=OUT/'pieces'/theme; piece_dir.mkdir(parents=True,exist_ok=True)
    for r in (0,1,6,7):
        clean_r=2 if r%2==0 else 3
        for c in range(8):
            tx0,tx1=xs[c],xs[c+1]; ty0,ty1=ys[r],ys[r+1]
            bx0,bx1=xs[c],xs[c+1]; by0,by1=ys[clean_r],ys[clean_r+1]
            patch=resized_patch(a,bx0,by0,bx1,by1,tx1-tx0,ty1-ty0)
            board[ty0:ty1,tx0:tx1]=patch
    Image.fromarray(np.uint8(np.clip(board,0,255)),'RGB').save(OUT/'boards'/f'{theme}.jpg',quality=95,optimize=True)
    (OUT/'boards').mkdir(exist_ok=True)
    # board save was before directory creation; move/retry if needed
    if not (OUT/'boards'/f'{theme}.jpg').exists():
        Image.fromarray(np.uint8(np.clip(board,0,255)),'RGB').save(OUT/'boards'/f'{theme}.jpg',quality=95,optimize=True)
    for side,rows in [('b',(0,1)),('w',(6,7))]:
        for r in rows:
            clean_r=2 if r%2==0 else 3
            # The first/last occupied ranks contain major pieces; the adjacent
            # ranks contain pawns.  Do not reinterpret pawn cells as majors.
            if r in (1, 6):
                cells=[(c, 'p') for c in range(8)]
            else:
                cells=[]
                for c,kind in enumerate(PIECE_ORDER):
                    if kind not in {k for _,k in cells}:
                        cells.append((c, kind))
            for c,kind in cells:
                tx0,tx1=xs[c],xs[c+1]; ty0,ty1=ys[r],ys[r+1]
                tile=resized_patch(a,tx0,ty0,tx1,ty1,bw,bh)
                bg=resized_patch(a,xs[c],ys[clean_r],xs[c+1],ys[clean_r+1],bw,bh)
                # Match the clean square to the occupied square using only
                # the outer border, where the piece cannot be present. This
                # removes JPEG/lighting drift between ranks before masking.
                border=np.zeros((bh,bw),dtype=bool); edge=28
                border[:edge,:]=border[-edge:,:]=border[:,:edge]=border[:,-edge:]=True
                offset=np.median((tile-bg)[border],axis=0)
                bg=np.clip(bg+offset,0,255)
                d=np.max(np.abs(tile-bg),axis=2)
                # Bright / dark piece pixels differ strongly from the same-color square.
                raw=(d>threshold)
                raw[:10,:]=raw[-10:,:]=raw[:,:10]=raw[:,-10:]=False
                mask=connected_keep(raw)
                # Extend soft glow one pixel around the hard mask and derive a soft alpha.
                dil=mask.copy()
                for dy,dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                    sy=slice(max(0,dy),min(bh,bh+dy)); sx=slice(max(0,dx),min(bw,bw+dx))
                    ty=slice(max(0,-dy),min(bh,bh-dy)); tx=slice(max(0,-dx),min(bw,bw-dx))
                    dil[ty,tx] |= mask[sy,sx]
                alpha=np.zeros((bh,bw),dtype=np.uint8)
                alpha[mask]=255
                alpha[dil & ~mask]=np.clip((d[dil & ~mask]-threshold)*10,0,160).astype(np.uint8)
                # Grid/frame edges are not part of a piece. The source art
                # leaves a small safety margin around every occupied square.
                margin=30
                alpha[:margin,:]=alpha[-margin:,:]=alpha[:,:margin]=alpha[:,-margin:]=0
                # Never let isolated compression noise survive.
                if mask.sum()<40: alpha[:]=0
                rgba=np.dstack([np.uint8(np.clip(tile,0,255)),alpha])
                Image.fromarray(rgba,'RGBA').save(piece_dir/f'{side}_{kind}.png',optimize=True)

for theme,(path,bounds,threshold) in REFS.items():
    (OUT/'boards').mkdir(exist_ok=True)
    process(theme,path,bounds,threshold)
print('wrote',OUT)
