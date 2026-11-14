"""Dessine les icônes de l'extension (bouclier bleu barré) : python tools/make_icons.py

Nécessite Pillow (pip install pillow). Les PNG générés sont déjà dans le dossier icons/ :
ce script ne sert que si l'on veut changer le dessin.
"""

from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 512
OUT = Path(__file__).resolve().parent.parent / "icons"


def draw_master() -> Image.Image:
    """Carré arrondi en dégradé bleu, bouclier blanc et barre diagonale rouge."""
    gradient = Image.new("RGB", (SIZE, SIZE))
    pixels = gradient.load()
    for y in range(SIZE):
        for x in range(SIZE):
            t = (x + y) / (2 * SIZE)
            pixels[x, y] = (int(37 + (30 - 37) * t), int(99 + (64 - 99) * t), int(235 + (175 - 235) * t))

    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=110, fill=255)
    icon = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    icon.paste(gradient, (0, 0), mask)

    draw = ImageDraw.Draw(icon)
    shield = [(256, 70), (410, 125), (410, 270), (256, 440), (102, 270), (102, 125)]
    draw.polygon(shield, fill=(255, 255, 255, 255))
    draw.line((165, 165, 347, 347), fill=(220, 38, 38, 255), width=44)
    draw.ellipse((165 - 22, 165 - 22, 165 + 22, 165 + 22), fill=(220, 38, 38, 255))
    draw.ellipse((347 - 22, 347 - 22, 347 + 22, 347 + 22), fill=(220, 38, 38, 255))
    return icon


def main() -> None:
    OUT.mkdir(exist_ok=True)
    master = draw_master()
    for size in (16, 32, 48, 128):
        master.resize((size, size), Image.LANCZOS).save(OUT / f"icon{size}.png")
        print(f"icons/icon{size}.png")


if __name__ == "__main__":
    main()
