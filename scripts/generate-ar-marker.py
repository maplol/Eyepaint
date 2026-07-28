#!/usr/bin/env python3
"""Generate EYEPAINT printable ArUco marker sheet + card."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'markers'

DPI = 300
DICT_ID = cv2.aruco.DICT_4X4_50
CENTER_ID = 0
CORNER_IDS = (1, 2, 3, 4)
INK = '#1C2428'
ACCENT = '#E09A6A'
MUTED = '#5A656B'
PAPER = '#F5F7F8'


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    names = (
        'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf',
        'LiberationSans-Bold.ttf' if bold else 'LiberationSans-Regular.ttf',
        'FreeSansBold.ttf' if bold else 'FreeSans.ttf',
    )
    roots = (
        Path('/usr/share/fonts/truetype/dejavu'),
        Path('/usr/share/fonts/truetype/liberation'),
        Path('/usr/share/fonts/truetype/freefont'),
    )
    for root in roots:
        for name in names:
            path = root / name
            if path.exists():
                return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def mm(px_per_mm: float, value: float) -> int:
    return int(value * px_per_mm)


def make_aruco(dictionary, marker_id: int, size_px: int) -> Image.Image:
    arr = cv2.aruco.generateImageMarker(dictionary, marker_id, size_px, borderBits=1)
    return Image.fromarray(arr).convert('RGB')


def centered_text(
    draw: ImageDraw.ImageDraw,
    y: float,
    text: str,
    font: ImageFont.ImageFont,
    fill: str,
    width: int,
) -> int:
    bb = draw.textbbox((0, 0), text, font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    draw.text(((width - tw) / 2, y), text, fill=fill, font=font)
    return th


def build_a4(dictionary) -> Image.Image:
    w = mm(DPI / 25.4, 210)
    h = mm(DPI / 25.4, 297)
    canvas = Image.new('RGB', (w, h), PAPER)
    draw = ImageDraw.Draw(canvas)

    font_brand = load_font(140, bold=True)
    font_sub = load_font(42)
    font_hint = load_font(36)
    font_meta = load_font(28)
    font_small = load_font(24)

    brand_y = int(h * 0.08)
    bh = centered_text(draw, brand_y, 'EYEPAINT', font_brand, INK, w)
    uy = brand_y + bh + 28
    draw.rectangle([w * 0.35, uy, w * 0.65, uy + 10], fill=ACCENT)
    centered_text(draw, uy + 36, 'Маркер плоскости AR', font_sub, MUTED, w)

    marker_mm = 90
    marker_px = mm(DPI / 25.4, marker_mm)
    quiet = int(marker_px * 0.22)
    plate = Image.new('RGB', (marker_px + quiet * 2, marker_px + quiet * 2), '#FFFFFF')
    plate.paste(make_aruco(dictionary, CENTER_ID, marker_px), (quiet, quiet))
    outer = Image.new('RGB', (plate.width + 24, plate.height + 24), '#FFFFFF')
    outer.paste(plate, (12, 12))
    ImageDraw.Draw(outer).rectangle(
        [0, 0, outer.width - 1, outer.height - 1],
        outline=ACCENT,
        width=6,
    )

    mx = (w - outer.width) // 2
    my = int(h * 0.28)
    canvas.paste(outer, (mx, my))
    centered_text(
        draw,
        my + outer.height + 36,
        f'ArUco 4×4  ·  ID {CENTER_ID}  ·  {marker_mm} мм',
        font_meta,
        MUTED,
        w,
    )

    hints = [
        '1. Распечатай лист без масштаба (100% / Actual size)',
        '2. Положи маркер на стол / лист бумаги',
        '3. В EYEPAINT: режим AR → дождись фиксации',
        '4. Убери маркер в сторону — референс останется на плоскости',
        '5. Камера сдвинулась → «Перекалибровать»',
    ]
    hy = my + outer.height + 120
    for i, line in enumerate(hints):
        centered_text(draw, hy + i * 58, line, font_hint, INK, w)

    corner_px = mm(DPI / 25.4, 28)
    margin = mm(DPI / 25.4, 18)
    corners = [
        (margin, margin, CORNER_IDS[0]),
        (w - margin - corner_px, margin, CORNER_IDS[1]),
        (margin, h - margin - corner_px, CORNER_IDS[2]),
        (w - margin - corner_px, h - margin - corner_px, CORNER_IDS[3]),
    ]
    for x, y, mid in corners:
        canvas.paste(make_aruco(dictionary, mid, corner_px), (x, y))

    centered_text(
        draw,
        h - margin - corner_px - 70,
        'maplol/Eyepaint  ·  dict DICT_4X4_50  ·  center ID 0  ·  corners 1–4',
        font_small,
        MUTED,
        w,
    )
    centered_text(
        draw,
        h - margin - corner_px - 36,
        'Формат A4 · печать односторонняя · не ламинировать глянцем (блики мешают)',
        font_small,
        MUTED,
        w,
    )
    return canvas


def build_card(dictionary) -> Image.Image:
    side = mm(DPI / 25.4, 150)
    card = Image.new('RGB', (side, side), PAPER)
    draw = ImageDraw.Draw(card)
    font_brand = load_font(72, bold=True)
    font_sub = load_font(28)

    bh = centered_text(draw, int(side * 0.08), 'EYEPAINT', font_brand, INK, side)
    draw.rectangle(
        [side * 0.32, int(side * 0.08) + bh + 16, side * 0.68, int(side * 0.08) + bh + 24],
        fill=ACCENT,
    )

    marker_mm = 70
    marker_px = mm(DPI / 25.4, marker_mm)
    quiet = int(marker_px * 0.2)
    plate = Image.new('RGB', (marker_px + quiet * 2, marker_px + quiet * 2), '#FFFFFF')
    plate.paste(make_aruco(dictionary, CENTER_ID, marker_px), (quiet, quiet))
    cx = (side - plate.width) // 2
    cy = (side - plate.height) // 2 + 20
    card.paste(plate, (cx, cy))
    centered_text(
        draw,
        cy + plate.height + 28,
        'AR · ID 0 · убери после фиксации',
        font_sub,
        MUTED,
        side,
    )
    return card


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    dictionary = cv2.aruco.getPredefinedDictionary(DICT_ID)

    a4 = build_a4(dictionary)
    a4_path = OUT / 'eyepaint-ar-marker-a4.png'
    a4.save(a4_path, 'PNG', dpi=(DPI, DPI))

    card = build_card(dictionary)
    card_path = OUT / 'eyepaint-ar-marker-card.png'
    card.save(card_path, 'PNG', dpi=(DPI, DPI))

    solo_px = mm(DPI / 25.4, 90)
    solo = make_aruco(dictionary, CENTER_ID, solo_px).convert('L')
    solo_path = OUT / 'eyepaint-aruco-id0.png'
    solo.save(solo_path, 'PNG')

    meta = {
        'name': 'EYEPAINT AR marker',
        'dictionary': 'DICT_4X4_50',
        'opencvDictId': int(DICT_ID),
        'centerId': CENTER_ID,
        'cornerIds': list(CORNER_IDS),
        'centerSizeMm': 90,
        'cornerSizeMm': 28,
        'sheet': a4_path.name,
        'card': card_path.name,
        'solo': solo_path.name,
        'print': 'A4, 100% scale, matte paper preferred',
    }
    (OUT / 'marker.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
    print('wrote', a4_path)
    print('wrote', card_path)
    print('wrote', solo_path)


if __name__ == '__main__':
    main()
