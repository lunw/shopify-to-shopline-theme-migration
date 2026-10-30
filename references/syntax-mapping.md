# Liquid → SLine syntax mapping

Only mappings **verified in a real migration** are listed. When a tag is not here, do not
guess — resolve it with the theme-development skill:

```bash
node scripts/search_docs.mjs "<tag name>"
```

---

## File structure

| Shopify | SHOPLINE |
|---|---|
| `layout/theme.liquid` | `layout/theme.html` |
| `layout/password.liquid` | `layout/password.html` |
| `layout/gift_card.liquid` | `layout/gift_card.html` |
| `templates/*.json` (JSON templates) | `templates/*.json` (same idea, different schema keys) |
| `templates/*.liquid` | `templates/*.html` |
| `sections/x.liquid` | `sections/x/x.html` (**one directory per section**) |
| `snippets/x.liquid` | `components/x.html` |
| `assets/x.css` | `public/x.css` (`asset_url()` resolves here) |
| `locales/en.default.json` | `i18n/en.json` |
| `config/settings_schema.json` | `config/settings_schema.json` |
| `config/settings_data.json` | not migrated (rebuilt in the editor) |

Section assets are referenced relative to the section directory:

```sline
<link rel="stylesheet" href="{{ "./main-product.css" | asset_url() }}">
```

---

## Tags

| Liquid | SLine |
|---|---|
| `{% schema %} … {% endschema %}` | `{{#schema}} … {{/schema}}` (JSON body, mostly unchanged) |
| `{% stylesheet %} … {% endstylesheet %}` | no equivalent — move to `.css` file or `<style>` |
| `{% javascript %} … {% endjavascript %}` | no equivalent — move to `.js` file or `<script>` |
| `{% render 'card' %}` | `{{#component "card" /}}` |
| `{% render 'card', product: p %}` | `{{#component "card" product=p /}}` |
| `{% section 'header' %}` | `{{#section "header" /}}` |
| `{% layout 'gift_card' %}` | `{{#layout "gift_card" /}}` |
| `{{ content_for_header }}` | `{{#content "header" /}}` |
| `{{ content_for_layout }}` | `{{#content "layout" /}}` |
| `{{ content_for_footer }}` | `{{#content "footer" /}}` |
| `{% assign x = y %}` | `{{#var x = y /}}` |
| `{% assign x = y %}` then mutate | `{{#set x = y /}}` |
| `{% capture x %}…{% endcapture %}` | `{{#capture x}}…{{/capture}}` |
| `{% if c %}` | `{{#if c}}` |
| `{% elsif c %}` | `{{#else if c /}}` |
| `{% else %}` | `{{#else/}}` |
| `{% endif %}` | `{{/if}}` |
| `{% unless c %}` | `{{#if !c}}` |
| `{% for x in y %}` | `{{#for x in y}}` … `{{/for}}` |
| `{% break %}` / `{% continue %}` | not available — restructure |
| `{% case v %}` | `{{#switch v}}` |
| `{% when 'a' %}` | `{{#case "a" /}}` |
| `{% endcase %}` | `{{/switch}}` |
| `{% comment %}…{% endcomment %}` | HTML comment `<!-- … -->` (SLine comments still parse tags) |

> **Comment trap:** a `{{#blocks}}` written inside an HTML/JS comment is still parsed as a
> real tag and breaks the tag balance. Never mention SLine tags in comments.

## Forms

| Shopify | SHOPLINE |
|---|---|
| `{% form 'product', product %}` | `{{#product_form product id="product-form" }}` … `{{/product_form}}` |
| `{% form 'contact' %}` | `{{#contact_form class="…"}}` … `{{/contact_form}}` |
| `{% form 'customer_login' %}` | `{{#customer_login_form class="…"}}` … `{{/customer_login_form}}` |
| `{% form 'create_customer' %}` | `{{#create_customer_form class="…"}}` … `{{/create_customer_form}}` |
| `{% form 'customer' %}` (newsletter) | `{{#customer_subscribe_form}}` … `{{/customer_subscribe_form}}` |
| `{% form 'recover_customer_password' %}` | `{{#recover_customer_password_form}}` |

Field names inside the forms stay Shopify-compatible: `customer[email]`,
`customer[password]`, `contact[body]`, `id`, `quantity`.

## Filters

| Liquid | SLine |
|---|---|
| `\| t` | `\| t()` |
| `\| t: count: n` | `\| t(count = n)` |
| `\| money` | `\| money()` |
| `\| money_with_currency` | `\| money_with_currency(currency = x)` |
| `\| image_url: width: 600` | `\| image_url(width=600)` |
| `\| date: "%Y"` | `\| date(format = "%Y")` ← **named argument required** |
| `\| default: 'x'` | `\| default("x")` |
| `\| default: false, allow_false: true` | `\| default(false, allow_false = true)` |
| `\| json` | `\| json()` |
| `\| where: 'k', 'v'` | `\| where("k", equals = v)` |
| `\| size` | `\| size()` (arrays only; `.size` is silently empty) |
| `\| strip_html` | `\| strip_html()` |
| `\| truncate: 160` | `\| truncate(160)` |
| `\| split: ','` | `\| split(",")` |
| `\| append: 'x'` | `\| append("x")` |

## Schema differences

The JSON body of `{{#schema}}` is close to Shopify's but not identical:

- `"settings": [...]` — same types (`text`, `textarea`, `richtext`, `image`, `url`,
  `checkbox`→**`switch`**, `range`, `select`, `color_scheme`, `menu`, `product`,
  `collection`, `blog`, `page`).
- `{% comment %}`-style `"info"` fields — supported.
- Blocks: **`"blocks": [{ "type": "$column", "limit": 8 }]`** — the `$` prefix marks a
  private block whose file lives in `sections/<section>/blocks/<name>.html`.
- `"presets"` — same shape; `"blocks"` inside a preset is a list of `{ "type": "$x" }`.
- Template JSON uses `"sections"`, `"order"`, and per-section `"blocks"` + `"block_order"`.

## Object syntax

| Liquid | SLine |
|---|---|
| `{{ settings.color }}` | `{{ settings.color.hex }}` (color is an object, not a string) |
| `{{ product.price \| money }}` | `{{{ product.price \| money() }}}` (money returns HTML) |
| `{{ product.variants }}` | `{{ product \| get_variants() }}` |
| `{{ collection.products }}` | `{{ collection \| get_product_pagination(n) }}` → `.list` |
| `{{ blog.articles }}` | `{{ blog \| get_article_pagination(n) }}` → `.list` |
| `{{ search.results }}` | `{{ search \| get_search_pagination(n) }}` → `.list` |
| `{{ customer.orders }}` | `{{ customer \| get_order_pagination(n) }}` → `.list` |
