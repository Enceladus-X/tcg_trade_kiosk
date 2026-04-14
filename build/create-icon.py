"""
TCG 매입 키오스크 아이콘 생성
실행: python build/create-icon.py
"""
from PIL import Image, ImageDraw
import os

def create_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = max(1, size // 16)
    r = size // 5  # border radius

    # 배경: zinc-900
    draw.rounded_rectangle([pad, pad, size - pad, size - pad],
                            radius=r, fill=(24, 24, 27, 255))

    # 황금 테두리
    gold = (245, 158, 11, 255)
    bw = max(1, size // 28)
    draw.rounded_rectangle([pad, pad, size - pad, size - pad],
                            radius=r, outline=gold, width=bw)

    # 카드 모양 안쪽 패널
    ip = size // 6
    draw.rounded_rectangle([ip, ip, size - ip, size - ip],
                            radius=r // 2, fill=(39, 39, 42, 255))

    # 골드 내부 테두리 얇게
    draw.rounded_rectangle([ip, ip, size - ip, size - ip],
                            radius=r // 2, outline=(180, 120, 20, 180), width=max(1, bw // 2))

    # 중앙 다이아몬드 심벌
    cx, cy = size // 2, size // 2
    d = size * 0.26

    # 외부 다이아몬드 (밝은 골드)
    pts = [
        (cx, cy - d),
        (cx + d * 0.65, cy),
        (cx, cy + d),
        (cx - d * 0.65, cy),
    ]
    draw.polygon(pts, fill=(245, 158, 11, 255))

    # 내부 다이아몬드 (어두운 골드 - 입체감)
    di = d * 0.45
    inner = [
        (cx, cy - di),
        (cx + di * 0.65, cy),
        (cx, cy + di),
        (cx - di * 0.65, cy),
    ]
    draw.polygon(inner, fill=(161, 100, 5, 255))

    # 상단 작은 점 장식 (별 느낌)
    dot_r = max(1, size // 28)
    dot_y = ip + (size // 2 - ip) // 3
    for dx in [-size // 10, 0, size // 10]:
        draw.ellipse([cx + dx - dot_r, dot_y - dot_r,
                      cx + dx + dot_r, dot_y + dot_r],
                     fill=gold)

    return img

os.makedirs(os.path.dirname(__file__), exist_ok=True)

sizes = [16, 32, 48, 64, 128, 256]

# Save a 256x256 master and let Pillow resize down for each ICO frame
master = create_icon(256)
out = os.path.join(os.path.dirname(__file__), 'icon.ico')
master.save(out, format='ICO', sizes=[(s, s) for s in sizes])
print(f'icon saved: {out}')
