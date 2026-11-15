# Иконки приложения и превью для соцсетей из шрифта Pacifico и фото фасада
import io, os, sys
from PIL import Image, ImageDraw, ImageFont


root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tmp = sys.argv[1]

ttf = os.path.join(tmp, 'pac.ttf')

def icon(n):
    im = Image.new('RGB', (n, n), (224, 72, 45)); d = ImageDraw.Draw(im)
    ft = ImageFont.truetype(ttf, int(n * .36))
    t = 'Ликс'; b = d.textbbox((0, 0), t, font=ft); w = b[2] - b[0]; h = b[3] - b[1]
    d.text(((n - w) / 2 - b[0], (n - h) / 2 - b[1] - n * .02), t, font=ft, fill='white')
    return im

for n in (180, 192, 512):
    icon(n).save(os.path.join(root, f'assets/icon-{n}.png'))

fac = Image.open(os.path.join(root, 'assets/facade.jpg'))
W, H = 1200, 630
og = Image.new('RGB', (W, H), (224, 72, 45))
ph = fac.resize((630, 840)).crop((0, 105, 630, 735)); og.paste(ph, (W - 630, 0))
d = ImageDraw.Draw(og)
d.text((70, 150), 'Ликс', font=ImageFont.truetype(ttf, 150), fill='white')
og.save(os.path.join(root, 'assets/og.jpg'), quality=86)
print('ok')
