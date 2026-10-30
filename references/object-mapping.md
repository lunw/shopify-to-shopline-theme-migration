# Object & field mapping (verified)

Every row was verified against a live SHOPLINE store and/or the official Fashion1 theme.
**When a field is in doubt, grep the official theme — do not guess:**

```bash
rg "get_variants|get_product_pagination|product_title" _reference/
```

The pattern behind most bugs: **Shopify and SHOPLINE share object names but not always the
same fields.** A wrong field fails silently (empty string / empty loop), so the page renders
without error and looks merely "unstyled" or "empty".

---

## Product

| Need | Shopify habit | SHOPLINE | Failure if wrong |
|---|---|---|---|
| Variant list | `product.variants` | `product \| get_variants()` | **Empty** inside sections → no variant picker, quick-add never renders |
| Default variant | `product.selected_or_first_available_variant` | same ✅ | — |
| Variant option values | `variant.options` | `variant.option1 / option2 / option3` | `options` array does not exist → `[]` |
| Option groups | `product.options_with_values` | same ✅ | — |
| Option values in a group | `option.values` (strings) | `option.option_values` → items with `.value` `.selected` `.available` `.image` | `option.selected_value` does not exist → nothing preselected |
| Media | `product.media` ✅ | same ✅ **but** count via `\| size()` | `media.size` is empty → "No image" placeholder |
| Media image | `media.preview_image` | same ✅; pass the object to `image_url` | `media.preview_image.src \| image_url` → empty src |
| Price range | `product.price_min/price_max` ✅ | same ✅ | Showing `product.price` alone hides "From $X" |
| Compare-at | `product.compare_at_price` ✅ | same ✅ | Always guard `compare > price`; bad data is common |
| Description | `product.description` (HTML) | same, use `{{{ }}}` | — |

Card price with a range (official behaviour):

```sline
{{#var lo = product.price_min | default(product.price) /}}
{{#var hi = product.price_max | default(product.price) /}}
{{#if lo != hi}}
  {{#var lo_html = lo | money() /}}
  {{{ "content.price_from" | t(price = lo_html) }}}
{{#else/}}
  {{{ product.price | money() }}}
{{/if}}
```

## Collection

| Need | SHOPLINE | Notes |
|---|---|---|
| Products | `collection \| get_product_pagination(n)` → `.list` | `collection.products` is not the way |
| Count | `collection.products_count` ✅ | |
| Sort options | `collection.sort_options` → `.value` `.name` | do not hard-code Shopify sort keys |
| Current sort | `collection.sort_by` ✅ | |
| Filters | `collection.filters` → `.label` `.type` `.param_name` `.values` `.active_values` | `type == "price_range"` for price |
| Filter value | `.label` `.value` `.count` `.active` `.param_name` | `param_name` is what the input must be named |
| Price filter inputs | `filter.min_value.param_name` / `filter.max_value.param_name` / `filter.range_max` | |
| Form action | **`request.path`** | `collection.url` drops the handle on `/collections/all` (handle is empty) |

Filters can be rendered **server-side** as a plain GET form — no JS needed:

```sline
<form method="get" action="{{ request.path }}">
  {{#for filter in collection.filters}}
    {{#switch filter.type}}
      {{#case "price_range" /}}
        <input type="number" name="{{ filter.min_value.param_name }}" value="{{ filter.min_value.value }}">
        <input type="number" name="{{ filter.max_value.param_name }}" value="{{ filter.max_value.value }}">
      {{#else/}}
        {{#for value in filter.values}}
          <input type="checkbox" name="{{ value.param_name }}" value="{{ value.value }}"
                 {{#if value.active}}checked{{/if}}
                 {{#if !value.active && value.count == 0}}disabled{{/if}}>
        {{/for}}
    {{/switch}}
  {{/for}}
  <button type="submit">Apply</button>
</form>
```

## Cart

| Need | Shopify habit | SHOPLINE | Failure if wrong |
|---|---|---|---|
| Line items | `cart.items` ✅ | same ✅ | — |
| Item title | `item.title` | **`item.product_title`** | Blank title in cart |
| Item image | `item.image` | **`item.image.src`** to test, object to render | No image |
| Item options | `item.variant.title` | **`item.options_with_values`** → `.name` `.value` | Blank variant label |
| Line price | `item.final_line_price` ✅ | same ✅ (HTML → `{{{ }}}`) | |
| Remove link | `item.url_to_remove` | **does not exist** | Remove button never renders |
| Quantity field | `updates[]` ✅ | same ✅ | |
| Form action | `/cart` ✅ | same ✅ | |

Removal without AJAX: a button that zeroes that row's `updates[]` and submits the cart form.

```html
<button type="button" data-remove-line>Remove</button>
<script>
  document.querySelector('.main-cart__form').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-remove-line]');
    if (!btn) return;
    var row = btn.closest('.main-cart__item');
    var input = row && row.querySelector('input[name="updates[]"]');
    if (input) { input.value = 0; e.currentTarget.submit(); }
  });
</script>
```

## Search

| Need | SHOPLINE | Failure if wrong |
|---|---|---|
| Query parameter | **`keyword`** (not `q`) | Search never executes; page just reloads |
| Form action | `routes.search_url` | |
| Terms | `search.terms` ✅ | |
| Performed flag | `search.performed` ✅ | |
| Count | `search.results_count` ✅ | |
| Results | **`search \| get_search_pagination(n)` → `.list`** | `search.results` is empty → 0 results |
| Result type | `item.object_type` ✅ | |
| Predictive search | `GET /search?section_id=predictive-search&keyword=…` returns a section fragment | |

## Orders / customer

| Need | Shopify habit | SHOPLINE |
|---|---|---|
| Order list | `customer.orders` | `customer \| get_order_pagination(n)` → `.list` |
| Order link | `order.customer_url` | `{{ routes.account_order_list_url }}/{{ order.id }}` |
| Order number | `order.name` | `order.order_number` |
| Order total | `order.total_price` | `order.presentment_price` + `money_with_currency(currency = order.presentment_currency)` |
| Status labels | `order.financial_status_label` / `order.fulfillment_status_label` | same ✅ |
| Addresses | `customer.addresses` ✅ | same ✅ — but count with `\| size()` |
| Login form | `{% form 'customer_login' %}` | `{{#customer_login_form}}` |

## Global / routes

`shop.name`, `cart.item_count`, `routes.cart_url`, `routes.search_url`,
`routes.account_url`, `routes.account_order_list_url`, `routes.product_recommendations_url`,
`request.path`, `request.locale.iso_code`, `localization.country.currency` — all verified.

`request.url` is **empty**; use `request.path`.

## Settings

| Type | Access |
|---|---|
| `color` | `settings.x.hex` (also `.red` `.green` `.blue` `.alpha`) |
| `image` | object — pass to `image_url(width=…)` |
| `richtext` | HTML — must use `{{{ }}}` |
| `switch` | boolean (`checkbox` in Shopify schema → `switch`) |
| fonts | CSS vars only; values must be `"Family:Weight"` |
