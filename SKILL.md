---
name: shopify-to-shopline-theme-migration
description: Use this skill when migrating a Shopify theme (Liquid/JSON templates) to a SHOPLINE theme (SLine/OS 3.0), or when porting a Shopify section, block, snippet, or template into a SHOPLINE theme. Trigger on requests like "migrate this Shopify theme to SHOPLINE", "port this section", "convert Liquid to SLine", "Shopify theme 迁移到 SHOPLINE", or when debugging a SHOPLINE theme that was ported from Shopify and has blank images, empty lists, dead links, raw translation keys, or broken variant pickers. Also use it when a Shopify-derived SHOPLINE theme needs its product / collection / cart / search / order data access audited against official SHOPLINE themes.
---

# Shopify → SHOPLINE Theme Migration

Port a **theme template layer** from Shopify to SHOPLINE OS 3.0. This skill encodes a
completed end-to-end migration (248 → 253 files, 19 templates, 30 sections, 34 locales)
and, more importantly, the ~20 silent failures that make a ported theme *look* finished
while images are blank, lists are empty, and nothing is clickable.

**Read this first, then load only the reference you need.** Do not guess SHOPLINE object
or filter semantics — every rule below was verified against a live store and the official
Fashion1 theme.

---

## 1. Scope and boundaries — state these to the user up front

This skill migrates **the theme template layer only**. Be explicit about what is *not*
included, because "migrate my theme" is routinely read as "deliver a working store".

| In scope | Out of scope |
|---|---|
| SLine syntax conversion (`{{#schema}}`, `{{#component}}`, `{{#var}}`, …) | **Content / media population** — no product copy, no banner images, no blog posts, no collection curation |
| Section / block / component / template / layout file structure | **Page ↔ template mapping** — no URL redirects, no assigning templates to pages, no navigation menus, no collection/product binding |
| CSS variable and design-token alignment with SHOPLINE `base.css` | **Pixel-perfect visual parity** — fonts, spacing and breakpoints will differ |
| Data-access logic for product / collection / cart / search / order | Store settings, checkout, payments, shipping, apps |
| i18n key correctness across all locales | Translating locale packs (migrate the keys, not the prose) |

**Say this plainly:** after migration the merchant must **rebuild the theme** — bind
collections to sections, upload media, create menus, assign templates to pages, and
configure theme settings. A migrated theme with empty settings renders an empty store,
and that is expected, not a bug.

Never promise pixel-level fidelity. Say: "structurally equivalent, visually re-tunable."

---

## 2. Prerequisites

### Required

1. **SHOPLINE AI Suite installed in the agent** (all of these):
   - `shopline-theme-development` — SLine syntax, tags, filters, objects. Its
     `scripts/search_docs.mjs` is the only reliable way to resolve a doubtful tag
     (`node scripts/search_docs.mjs "customer_subscribe_form"`).
   - `shopline-admin-rest` — verify object fields and REST paths
     (`node scripts/search_rest.mjs "menu" --methods GET`).
   - `shopline-store-ops` — authenticated calls against the real store.
   - `shopline-auth` — OAuth / token setup.
2. **SHOPLINE CLI (`sl`)** on `PATH`, logged in:
   ```bash
   sl login --store <store>.myshopline.com
   ```
3. **Source theme files on disk** — the full Shopify theme directory, readable.
4. **A reference SHOPLINE theme** — clone an official theme (Fashion1 is what this skill
   was validated against) as `_reference/`. This is the single highest-value asset:
   when a data field is in doubt, grep the official theme instead of guessing.

### Not required

- **Shopify AI toolkit is optional.** The migration never calls Shopify APIs — you are
  converting source files that already exist locally. Install it only if you want to look
  up Shopify-side semantics (what `{% schema %}` fields mean, how `product.variants`
  behaves in Liquid). Skipping it changes nothing about the migration outcome.
- No Shopify store access, no Shopify CLI, no network access to the Shopify store.

### Environment gotcha that will cost you an hour

If `HTTP_PROXY` / `HTTPS_PROXY` are set, `sl` (axios) routes through the proxy and **every
command returns HTTP 400** — `whoami`, `theme list`, `theme push`, `theme check`. It looks
exactly like an expired session. It is not. `sl login` will not fix it.

Diagnose with `DEBUG=axios* sl whoami` (shows the real URL), then call the same URL with
Node `fetch` — which ignores proxy env vars — and watch it succeed. Fix by unsetting the
proxy variables; `scripts/sl.sh` in this skill does it for you.

---

## 3. Workflow

### Phase 0 — Inventory before writing anything

```bash
# What are we dealing with?
find <shopify-theme> -name "*.liquid" | wc -l
find <shopify-theme>/sections -name "*.liquid" | wc -l
cat <shopify-theme>/config/settings_schema.json | head -40
```

Record: template list, section list, block/snippet dependency graph, locales present,
settings keys. This inventory becomes the migration checklist and the delivery report.

### Phase 1 — Scaffold + design tokens first

Do **not** start with sections. A theme with correct structure and wrong tokens renders
as unstyled garbage, and you will re-debug every section twice.

1. `layout/theme.html` — `{{#component "page-head" /}}`, `{{#component "theme-css-var" /}}`,
   `{{#content "header" /}}`, `{{#content "layout" /}}`, `{{#content "footer" /}}`.
2. `config/settings_schema.json` — port settings; **rewrite every font value** to
   `"Family:Weight"` (e.g. `"Inter:400"`). Shopify handles (`inter_n4`) resolve to an empty
   object and silently produce `--font-body--family: , ;`.
3. `components/theme-css-var.html` — port the Shopify theme's
   `snippets/theme-styles-variables.liquid` `:root` block **mechanically**. Roughly 90% is
   plain CSS + `{{ settings.x }}` and needs no rewriting. Any CSS variable name you invent
   will not be consumed by `base.css`, so names must match exactly.

### Phase 2 — Sections in dependency order

Header/footer → product card component → collection → product → cart → search → content
sections → customer pages. After each batch: `theme check` → local render → screenshot →
`theme push` to the unpublished theme.

Push in **batches**, never one giant push at the end. A batch that breaks is trivial to
bisect; a 250-file push that breaks is not.

### Phase 3 — Data-layer audit against the official theme

**This is the phase that separates a demo from a working theme.** Syntax conversion can be
100% correct while every list is empty, because Shopify and SHOPLINE expose different
fields on the same-named objects. Work through `references/object-mapping.md` field by field.

### Phase 4 — Verification gates

Do not declare done until every gate in `references/verification.md` passes. A theme can
pass `theme check` with 0 errors and still have zero working links.

---

## 4. The rules that break silently

Full catalog with symptoms, root cause and fix in `references/pitfalls.md`. These ten are
the ones that cost the most time:

1. **`t()` returns the key itself when missing.** `| default("x")` does **not** rescue it —
   the key string is truthy. Audit every key against **every** locale, not just `en`.
2. **`money()` returns HTML.** Use `{{{ }}}`. Same for `richtext` settings.
3. **Arrays have no `.size`.** `{{ list.size }}` is silently empty. Use `{{ list | size() }}`.
   This alone caused: no product images, empty address list, and quick-add never rendering.
4. **`product.variants` is empty inside a section.** Use `product | get_variants()`.
   Variants expose `option1/option2/option3` — there is **no `options` array**.
5. **`{{#blocks}}` has no `forloop`.** `{{ forloop.index0 }}` inside a block renders empty.
   Never build indices there; generate them in JS or loop an array with `{{#for}}`.
6. **A block must be a separate file.** `sections/x/blocks/y.html` + `"type": "$y"`.
   Inline schema blocks render zero blocks, no matter which loop syntax you try.
7. **`image_url` takes the image object**, not `.src`. `x.src | image_url` yields an empty src.
8. **`date()` needs the named argument** `date(format = "%Y-%m-%d")`. Positional fails with
   `expect :2 get:3`.
9. **Search parameter is `keyword`, not `q`.** And results live behind
   `search | get_search_pagination(n)` — `search.results` is empty.
10. **`collection.url` loses the handle on `/collections/all`.** Use `request.path` for
    filter form actions and "clear all" links.

---

## 5. Component-level, not page-level

When a bug appears on one page, fix it at the **component** layer, then verify every other
page that uses the component. Two failures in this migration were exactly this:

- **Product card link dead everywhere.** `.product-card__link` is an absolutely positioned
  overlay, but `.product-card__content` is `position: relative` and later in the DOM, so it
  paints on top. The link exists, has an `href`, and can never be clicked — on collection,
  search, and recommendation grids alike. Fix: `z-index: 1` on the link, `z-index: 2` +
  `pointer-events: none` (until hover) on quick-add.
- **Component styles living in a section's CSS.** `.product-card*` rules sat in
  `main-collection.css`, so the same component rendered unstyled on search and in
  recommendation slots. Styles that belong to a reusable component must ship in a file the
  component itself `<link>`s.

**Corollary:** `opacity: 0` still hit-tests. A hidden overlay button swallows clicks. Any
invisible interactive element needs `pointer-events: none` until it becomes visible.

---

## 6. Reference index

| File | Load when |
|---|---|
| `references/syntax-mapping.md` | Converting Liquid tags, schema, stylesheets, forms |
| `references/object-mapping.md` | Any product / collection / cart / search / order / customer field |
| `references/pitfalls.md` | Something renders blank, empty, raw, or dead |
| `references/verification.md` | Before declaring a batch done; how to prove clicks work |

## 7. Delivery

Produce a report containing: file/section/template counts, `theme check` result, locale
audit result, the object-mapping decisions you made, an explicit list of known gaps, and a
"how to verify" section (local serve, unpublished-theme preview URL, push command).

Also state the rebuild checklist: bind collections, upload media, create menus, assign
templates to pages, configure theme settings, enable customer accounts if the account
templates are to be used.
