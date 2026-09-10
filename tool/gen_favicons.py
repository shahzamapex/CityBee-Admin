"""Generate CityBee admin favicons from the citybee-mark.svg geometry.

Outputs (Next.js App Router file conventions):
  app/icon.svg        — square SVG favicon (modern browsers)
  app/favicon.ico     — multi-size ICO 16/32/48/64 (replaces Next.js default)
  app/apple-icon.png  — 180x180 iOS home-screen icon
"""
from PIL import Image, ImageDraw

ORANGE = (255, 111, 0, 255)        # #ff6f00
WHITE = (255, 255, 255, 255)
WING = (255, 255, 255, 242)        # 0.95 opacity

# SVG group is translate(10, 10); add the offset to every coordinate.
T = 10

def bez(p0, p1, p2, p3, n=32):
    """Cubic bezier polyline."""
    pts = []
    for i in range(n + 1):
        t = i / n
        mt = 1 - t
        x = mt**3*p0[0] + 3*mt**2*t*p1[0] + 3*mt*t**2*p2[0] + t**3*p3[0]
        y = mt**3*p0[1] + 3*mt**2*t*p1[1] + 3*mt*t**2*p2[1] + t**3*p3[1]
        pts.append((x, y))
    return pts

def line_cap(draw, a, b, width, color):
    """Line with round caps (stroke-linecap='round')."""
    draw.line([a, b], fill=color, width=width)
    r = width / 2
    for p in (a, b):
        draw.ellipse([p[0]-r, p[1]-r, p[0]+r, p[1]+r], fill=color)

def render(size):
    """Render the bee centered on a square `size` px transparent canvas."""
    # Bee bbox (absolute): x 20..100, y 15..110 -> center (60, 62.5), max dim 95.
    # Fit to 78% of the canvas with supersampling for smooth edges.
    SS = 8
    big = size * SS
    bee = 95.0
    scale = (big * 0.78) / bee
    cx, cy = 60.0, 62.5
    ox = big / 2 - cx * scale     # map SVG coords -> canvas px
    oy = big / 2 - cy * scale
    P = lambda x, y: (x * scale + ox, y * scale + oy)
    W = lambda w: max(1, round(w * scale))

    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # ── Body blob (orange) ────────────────────────────────────────────
    body = (bez((50+T, 5+T), (28+T, 5+T), (10+T, 23+T), (10+T, 45+T))
            + bez((10+T, 45+T), (10+T, 75+T), (50+T, 100+T), (50+T, 100+T))
            + bez((50+T, 100+T), (50+T, 100+T), (90+T, 75+T), (90+T, 45+T))
            + bez((90+T, 45+T), (90+T, 23+T), (72+T, 5+T), (50+T, 5+T)))
    d.polygon([P(x, y) for x, y in body], fill=ORANGE)

    # ── Wings (rotated white ellipses) ────────────────────────────────
    def wing(cx_s, cy_s, rx, ry, svg_angle):
        tile_w, tile_h = int(2*rx*scale) + 8, int(2*ry*scale) + 8
        tile = Image.new("RGBA", (tile_w, tile_h), (0, 0, 0, 0))
        ImageDraw.Draw(tile).ellipse([4, 4, tile_w-4, tile_h-4], fill=WING)
        # SVG rotate(+a) is clockwise on screen; PIL rotate(+a) is CCW.
        tile = tile.rotate(-svg_angle, resample=Image.BICUBIC, expand=True)
        px, py = P(cx_s, cy_s)
        img.paste(tile, (int(px - tile.width/2), int(py - tile.height/2)), tile)

    wing(26+T, 38+T, 12, 7, -30)   # left, tilted up-left
    wing(74+T, 38+T, 12, 7, 30)    # right, tilted up-right

    # ── Head circle (white) ───────────────────────────────────────────
    hx, hy = P(50+T, 27+T)
    hr = 7 * scale
    d.ellipse([hx-hr, hy-hr, hx+hr, hy+hr], fill=WHITE)

    # ── Antennae (white strokes) ──────────────────────────────────────
    a1 = bez((43+T, 27+T), (40+T, 22+T), (36+T, 21+T), (34+T, 23+T), 12)
    a2 = bez((57+T, 27+T), (60+T, 22+T), (64+T, 21+T), (66+T, 23+T), 12)
    for pts in (a1, a2):
        pl = [P(x, y) for x, y in pts]
        d.line(pl, fill=WHITE, width=W(3), joint="curve")
        for p in (pl[0], pl[-1]):
            r = W(3) / 2
            d.ellipse([p[0]-r, p[1]-r, p[0]+r, p[1]+r], fill=WHITE)

    # ── White abdomen ellipse ─────────────────────────────────────────
    ex, ey = P(50+T, 46+T)
    rx, ry = 18 * scale, 24 * scale
    d.ellipse([ex-rx, ey-ry, ex+rx, ey+ry], fill=WHITE)

    # ── Orange stripes (round caps) ───────────────────────────────────
    line_cap(d, P(37+T, 40+T), P(63+T, 40+T), W(4), ORANGE)
    line_cap(d, P(36+T, 50+T), P(64+T, 50+T), W(4), ORANGE)
    line_cap(d, P(40+T, 60+T), P(60+T, 60+T), W(4), ORANGE)

    return img.resize((size, size), Image.LANCZOS)

admin = r"C:\Users\StoreKeeper\Desktop\DATA\City Bee\CityBee-Admin"

# favicon.ico (16/32/48/64) + apple-icon.png (180) + hi-res master (512)
master = render(512)
master.save(rf"{admin}\app\favicon.ico",
            sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
render(180).save(rf"{admin}\app\apple-icon.png")
master.save(rf"{admin}\public\citybee-icon-512.png")
print("raster icons done")
