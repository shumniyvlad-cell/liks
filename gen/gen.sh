#!/bin/zsh
# Фото блюд для приложения Ликс (Higgsfield nano_banana_2, 2 кредита за кадр)
cd "${0:a:h}"
REF="$1"
BASE="Food photography for a cozy small coffee shop menu app. Same set as the reference photo: light oak wood-grain cafe table, matte pale mint-green stoneware ceramics, soft natural daylight from a big window on the left, a calm white wall softly out of focus behind. Three-quarter angle about 35 degrees, product centered with breathing room, shallow depth of field, true-to-life colors, no text, no logos, no hands, no people. Real photo, not a render. Subject:"
typeset -A P
P=(
cappuccino "a cappuccino in a matte mint ceramic cup on a saucer, glossy milk foam with a neat tulip latte art"
flatwhite "a small flat white in a matte mint ceramic cup, thin silky microfoam with a small heart latte art"
raf "a tall glass of spiced raf coffee, creamy beige, a cinnamon stick and a star anise on the saucer"
pumpkin "a pumpkin spice latte in a clear glass mug, orange-tinted milk foam dusted with cinnamon, a small piece of pumpkin beside"
matcha "an iced-free hot matcha latte in a matte mint ceramic cup, bright green with white milk swirl"
cocoa "a hot cocoa in a wide matte mint mug, topped with small white marshmallows"
espresso "a single espresso in a small matte mint ceramic demitasse cup with thick hazel crema, a sugar cube on the saucer"
tea "a glass teapot with bright orange sea buckthorn tea with berries and mint leaves, a small glass cup beside"
syrniki "three golden Russian syrniki (cottage cheese pancakes) on a mint plate, a dollop of sour cream, fresh raspberries and blueberries, powdered sugar"
omelette "a fluffy French omelette with a buttery croissant and a small green salad on a mint plate"
porridge "a bowl of creamy oatmeal porridge topped with lingonberries, blueberries, banana slices and a drizzle of honey, in a mint ceramic bowl"
medovik "a tall slice of Russian honey cake medovik with many thin layers and cream, crumbs on top, on a small mint plate"
cheesecake "a slice of New York cheesecake with a glossy berry sauce on top, on a small mint plate"
eclair "two classic eclairs with glossy chocolate glaze on a small mint plate"
croissant "an almond croissant with toasted almond flakes and powdered sugar on a small mint plate"
cinnabon "a soft cinnamon roll with white cream cheese frosting dripping, on a small mint plate"
)
for k v in ${(kv)P}; do
  [[ -f "$k.jpg" ]] && continue
  ( url=$(higgsfield generate create nano_banana_2 --prompt "$BASE $v" --aspect_ratio 4:5 --resolution 1k --image-references "$REF" --wait --json 2>/dev/null | python3 -c "import sys,json,re; t=sys.stdin.read(); m=re.findall(r'https://[^\"]+\.(?:png|jpg|jpeg|webp)',t); print(m[-1] if m else '')")
    if [[ -n "$url" ]]; then curl -sL "$url" -o "$k.raw" && echo "ok $k"; else echo "FAIL $k"; fi ) &
  sleep 2
done
wait
echo DONE
