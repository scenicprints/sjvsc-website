# Image generation prompts

Art to generate and drop into `assets/img/`. The homepage currently uses hand-written
SVG for its ornament — mountains, fir trees, edelweiss, the Swiss cross shield. These
prompts replace that with something far richer.

## Two rules

1. **No text in any generated image.** Generators mangle lettering, and German and
   Swiss German words come out as nonsense. All type is set in HTML.
2. **Generate atmosphere, never the club's own property.** Alpine landscapes, alphorn
   players, papercut art, cowbells, village scenes — all fine, and their current site
   already uses exactly this kind of imagery. What we must not generate is the hall's
   interior or a fake Schwingfest presented as theirs: renters judge the actual room,
   and the board would spot it instantly. Those stay real photographs.

## Technical notes

- **Scherenschnitt** (Swiss papercutting) is the signature device: pure black
  silhouette, intricate, symmetrical. Ask for **pure black on pure white** — easy to
  key out, recolour, or use as a CSS mask.
- Transparent PNG where the tool supports it; otherwise black-on-white and we key it.
- Generate at 2× the display size.

---

## A. Hero papercut band — the signature piece

Replaces the SVG treeline at the bottom of the red hero.

> Traditional Swiss Scherenschnitt papercut, pure black silhouette on pure white
> background. A horizontal alpine panorama: jagged snow-capped mountain peaks, dense
> fir forest, a tiny chalet with a steep roof, a herd of cows with bells walking in a
> line, a goat on a rock, edelweiss flowers scattered along the lower edge. Perfectly
> symmetrical, intricate hand-cut detail, fine connecting bridges between shapes, crisp
> clean edges. Folk art, no shading, no gradients, no text.

**Ratio** 12:1 (very wide) · **Use** full-bleed divider between coloured bands

## B. Schwingen papercut — the one that matters most

The club is first and foremost a Swiss wrestling club. This becomes the site's
signature image.

> Traditional Swiss Scherenschnitt papercut, pure black silhouette on pure white
> background. Two Swiss wrestlers in Schwingen hold: both men gripping each other's
> heavy burlap wrestling breeches, bent forward, heads together at the shoulder, legs
> braced wide. Encircled by a decorative wreath of edelweiss, alpine roses and fir
> sprigs. Symmetrical circular composition, intricate hand-cut folk art detail, crisp
> clean edges, no shading, no gradients, no text.

**Ratio** 1:1 · **Use** Schwingen section, and as a site-wide emblem

## C. Alphorn player

> Traditional Swiss Scherenschnitt papercut, pure black silhouette on pure white
> background. A single alphorn player in traditional Appenzell dress standing on a
> grassy ridge, the long curved alphorn resting on the ground before him, mountain
> peaks behind, two cows grazing nearby, fir trees at the edges. Intricate hand-cut
> folk art detail, crisp clean edges, no shading, no text.

**Ratio** 4:3 · **Use** Swiss Echoes section

**Photographic alternative**, if you want warmth instead of graphic punch:

> Golden hour photograph of an alphorn player in traditional Swiss dress on an alpine
> meadow, long wooden alphorn raised, snow-capped Bernese Alps behind, wildflowers in
> the foreground, soft warm backlight, shallow depth of field, documentary style.

## D. Alpine panorama

> Wide photograph of the Swiss Alps at golden hour: snow-capped peaks, dark green
> pine forest on the lower slopes, an alpine meadow with wildflowers, a wooden chalet
> with a steep roof, soft mist in the valley. Warm natural light, rich colour,
> landscape photography, no people, no text.

**Ratio** 21:9 · **Use** full-bleed band behind the mission statement

## E. Edelweiss ornament

> Traditional Swiss Scherenschnitt papercut, pure black silhouette on pure white
> background. A single edelweiss flower with woolly star-shaped petals, seen from
> above, flanked by symmetrical sprigs of alpine rose and fir. Small, simple,
> intricate hand-cut detail, crisp edges, no shading, no text.

**Ratio** 1:1 · **Use** section dividers (replaces the SVG edelweiss)

## F. Cantonal shields

The hall has the cantonal crests mounted on its wall — worth echoing.

> Traditional Swiss heraldic shields arranged in a single horizontal row, flat vector
> style, bold solid colours — red, white, blue, yellow, black — simple geometric
> charges, clean crisp edges, even spacing, white background, no shading, no gradients,
> no text, no lettering.

**Ratio** 8:1 · **Use** thin decorative band above the footer

## G. Parchment texture

> Seamless tileable texture of aged cream paper, subtle fibre grain, very faint warm
> mottling, soft and even, no creases, no stains, no text. Extremely subtle, almost flat.

**Ratio** 1:1, tileable · **Use** background overlay at ~4% opacity

---

## Suggested order

**B** first — the Schwingen papercut carries the identity and is the one the board
will respond to. Then **A**, then **C**. **E**, **F** and **G** are polish; the SVG
versions already in the page hold up without them.
