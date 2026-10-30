# Pitfall catalog — organised by symptom

Each entry: what you see → why → fix. Everything here happened in a real migration.

---

## Blank images

**Symptom:** product detail shows "No image" for a product that clearly has images.

**Cause:** `{{#if media_list.size > 0}}` — arrays have no `.size` property; the condition is
silently false and the placeholder branch runs.

**Fix:**
```sline
{{#var media_count = media_list | size() /}}
{{#if media_count > 0}}
```

Also: `media.preview_image.src | image_url` → empty src. Pass the object:
`{{ media.preview_image | image_url(width=1200) }}`.

---

## Empty lists / zero iterations

Same root cause in three different places. Grep for `.size` and for bare collection fields:

```bash
rg "\.size(?!\s*\|)" --pcre2 -g '*.html'      # .size without a filter
rg "product\.variants|customer\.orders|search\.results" -g '*.html'
```

| Looks like | Actually |
|---|---|
| `list.size` | `list \| size()` |
| `product.variants` | `product \| get_variants()` |
| `search.results` | `search \| get_search_pagination(n)` → `.list` |
| `collection.products` | `collection \| get_product_pagination(n)` → `.list` |

---

## Raw translation keys on the page

**Symptom:** `products.product.add_to_cart` printed literally.

**Cause:** the key does not exist in that locale. `t()` returns the key string, and
`| default("…")` cannot rescue it because the key string is truthy.

**Fix:** audit against **every** locale, not just `en`. Use `scripts/audit-i18n.mjs`.

**Trap:** copying a key from an official theme is not proof it exists in *your* theme's
locale files. Fashion1 uses `search.count_results`; a Horizon-derived theme has no `search`
namespace at all. Always audit after copying.

---

## HTML rendered as visible text

**Symptom:** the page shows `<p>Free shipping</p>` or
`<span class="notranslate trans-money">$85.50</span>`.

**Cause:** `money()` and `richtext` settings return HTML; `{{ }}` escapes it.

**Fix:** `{{{ }}}` for `money()`, `richtext`, and any `description`/`content` field.

---

## Nothing is clickable on product cards

**Symptom:** card and title clicks do nothing, on every page that shows a product grid.

**Cause:** `.product-card__link` is an absolutely positioned overlay, but
`.product-card__content` is `position: relative` and later in the DOM. Both are positioned,
so the content paints above the link. The anchor exists, has an `href`, and never receives
a click.

**Fix (component CSS):**
```css
.product-card__link { z-index: 1; }
.product-card__quick-add { z-index: 2; pointer-events: none; }
.product-card:hover .product-card__quick-add,
.product-card:focus-within .product-card__quick-add { pointer-events: auto; }
```

**Prove it** with hit testing, not by reading markup — see `verification.md`.

---

## Invisible buttons swallow clicks

**Symptom:** clicking the bottom of a card silently adds to cart instead of navigating.

**Cause:** `opacity: 0` does **not** remove an element from hit testing.

**Fix:** `pointer-events: none` while hidden; restore on `:hover` / `:focus-within`, and
always restore under `@media (hover: none)` where there is no hover to reveal it.

---

## A component is styled on one page and naked on another

**Symptom:** product cards look right on the collection page but the title is enormous on
the search page and in recommendation slots.

**Cause:** the component's CSS was written into a *section's* stylesheet, so any page that
uses the component without that section gets no styles.

**Fix:** ship component CSS in its own file and let the component link it:

```sline
<link rel="stylesheet" href="{{ "product-card.css" | asset_url() }}">
```

**Rule:** reusable component → styles travel with the component, never inside a section.

---

## Colors are `map[alpha:1 blue:255 …]`

**Cause:** SHOPLINE color settings are objects, not strings.

**Fix:** `{{ settings.page_background_color.hex }}`.

---

## Fonts render as nothing

**Symptom:** `--font-body--family: , ;` in the compiled CSS.

**Cause:** `config/settings_schema.json` still holds Shopify font handles (`inter_n4`).
SHOPLINE resolves them to an empty object.

**Fix:** rewrite every font default to `"Family:Weight"` — `"Inter:400"`.

**Related:** `base.css` consumes ~213 CSS custom properties. If you invent a variable name
it will simply not be read. Port the source theme's `:root` block mechanically rather than
re-typing variable names.

---

## Blocks render zero times

**Symptom:** a section with `{{#blocks}}` outputs the heading but no blocks.

**Cause:** blocks were declared inline in the section schema. In SHOPLINE a block must be
its own file.

**Fix (the only working shape):**
```
sections/multicolumn/
├── multicolumn.html        {{#blocks}} {{#block/}} {{/blocks}}
└── blocks/
    └── column.html         own {{#schema}}, uses {{{ block.shopline_attributes }}}
```
Schema: `"blocks": [{ "type": "$column", "limit": 8 }]`
Template JSON: `"blocks": { "c1": { "type": "$column", "settings": {…} } }` + `"block_order"`.

Inline blocks fail with `{{#for block in section.blocks}}`, with `{{#blocks}}` +
`forblock`, and with a `$` prefix on an inline schema. All three were tried.

---

## `forloop` is empty inside a block

**Symptom:** carousel dots all carry `data-slide-to=""`; clicking any dot jumps to slide 1.
Or `{{#if forloop.first}}` never fires, so the first image is lazy-loaded.

**Cause:** `{{#blocks}}` provides no `forloop` object.

**Fix:** never derive an index inside a block. Generate it in JS, or iterate a real array
with `{{#for}}` at section level (where `forloop` does work).

```js
slides.forEach(function (_, i) { /* build dots from i */ });
```

---

## `date()` throws `expect :2 get:3`

**Cause:** the filter takes a **named** argument.

**Fix:** `{{ article.published_at | date(format = "%Y-%m-%d") }}`

Do not conclude "date is unsupported" from the positional failure.

---

## Search never runs

**Symptom:** submitting the search form reloads the page with no results and an empty input.

**Cause:** the parameter is `keyword`, not Shopify's `q`.

**Fix:** `<input name="keyword">`, `action="{{ routes.search_url }}"`, and in JS
`url.searchParams.set('keyword', term)`.

---

## Collection filters navigate to the wrong page

**Symptom:** filtering on "All products" (`/collections/all`) lands on `/collections/`.

**Cause:** `collection.url` has no handle for the pseudo-collection; `collection.handle` is
empty there.

**Fix:** use `{{ request.path }}` for the filter form action and the "clear all" link.

---

## Cart line items are blank

**Cause:** Shopify field names. See `object-mapping.md`.

`item.title` → `item.product_title`; `item.variant.title` → loop
`item.options_with_values`; `item.url_to_remove` → **does not exist**.

---

## Carousel shows a huge blank area on slide 2

**Cause:** non-first slides were taken out of flow with
`.slide:not(:first-child) { position: absolute }`. The **first** slide never matches that
selector, so once hidden it still occupies its `min-height`.

**Fix:** stack all slides in one grid cell — no absolute positioning at all:

```css
.slideshow__track { display: grid; }
.slide { grid-area: 1 / 1; opacity: 0; visibility: hidden; pointer-events: none; }
.slide.is-active { opacity: 1; visibility: visible; pointer-events: auto; z-index: 1; }
```

---

## A section tag written in a comment breaks the build

**Symptom:** `InvalidSyntaxInSline: tag:blocks closed incorrectly`.

**Cause:** a `{{#blocks}}` inside a JS/HTML comment is parsed as a real opening tag.

**Fix:** never name SLine tags in comments — describe them in prose instead.

---

## `sl` returns HTTP 400 for everything

**Symptom:** `whoami`, `theme list`, `theme push`, `theme check` all fail with 400. Looks
like an expired session; `sl login` does not help.

**Cause:** `HTTP_PROXY` / `HTTPS_PROXY` are set and `sl` (axios) routes through the proxy.

**Diagnose:** `DEBUG=axios* sl whoami` shows the real URL; fetch that same URL with Node
`fetch` (which ignores proxy env vars) and watch it return 200.

**Fix:** unset the proxy variables before every `sl` call — `scripts/sl.sh` does it.

---

## Local preview lies about section fragments

**Symptom:** predictive search or product recommendations render nothing locally.

**Cause:** the local dev server does not implement `?section_id=` fragment rendering (it
returns the full page) and does not implement the recommendations endpoint (0 bytes).

**Fix:** guard the injection so a full page is never injected into a widget:

```js
if (html.indexOf('class="ps') === -1) return;   // not a fragment → do nothing
```

Verify these two features on the hosted unpublished theme, not locally.

---

## "Mobile layout is broken" (it usually is not)

**Symptom:** a 390 px screenshot shows clipped text and cut-off icons.

**Cause:** headless Chrome enforces a minimum window width (~489 px). The 390 px screenshot
is a crop of a 489 px layout, not an overflow.

**Check the real width** by writing it into the title and dumping the DOM:

```js
window.addEventListener('load', () => { document.title = 'w=' + document.documentElement.clientWidth; });
```
