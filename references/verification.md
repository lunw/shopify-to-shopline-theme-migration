# Verification playbook

`theme check` passing means the templates parse. It says nothing about whether images
render, lists populate, or anything is clickable. These gates cover the rest.

Run them in order; each catches a class of failure the previous one cannot.

---

## Gate 1 — Syntax

```bash
bash scripts/sl.sh theme check --path ./theme
```

Expect `N files inspected with 0 offenses`. A parse error names the tag and both line
numbers — read the *closing* line too, the real cause is often an unbalanced tag earlier.

## Gate 2 — i18n, every locale

```bash
node scripts/audit-i18n.mjs ./theme
```

Scans every `t()` key in `layout/ sections/ components/ blocks/ templates/` and checks it
against **all** locale files, not just `en`. A key missing from `zh-hans-cn` shows raw text
for Chinese shoppers even though English looks perfect.

## Gate 3 — Local render, page by page

```bash
bash scripts/sl.sh theme serve          # keep this terminal open
```

Then fetch each page and assert on content, not on status codes:

```js
const t = await (await fetch('http://127.0.0.1:9292/collections/all')).text();
(t.match(/product-card__link/g) || []).length     // cards actually rendered?
```

Check at minimum: `/`, `/collections/all`, a real collection, a product **with images and
multiple variants**, `/cart`, `/search?keyword=x`, `/404-x`, `/password`, plus one blog and
one page if the store has them.

### Empty-attribute sweep

Empty `href` / `src` / `action` attributes are the fingerprint of a wrong field:

```js
['href', 'src', 'action'].forEach(a => console.log(a, (t.match(new RegExp(a + '=""', 'g')) || []).length));
```

Ignore known false positives: platform-injected JS contains `window.location.href=""`, and
page JSON contains strings like `templates/cart.json`.

## Gate 4 — Hit testing (clicks)

Never conclude "the link works" from reading markup. Ask the browser what is actually under
the cursor:

```js
window.addEventListener('load', function () {
  var card = document.querySelector('.product-card');
  var r = card.getBoundingClientRect();
  var el = document.elementFromPoint(r.left + r.width / 2, r.top + 60);
  var chain = [], n = el;
  while (n && n !== document.body && chain.length < 4) {
    chain.push(n.tagName + '.' + (n.className || '').toString().split(' ')[0]);
    n = n.parentElement;
  }
  document.title = 'HIT ' + chain.join('>');
});
```

Expected: the top of the chain is the overlay anchor (`A.product-card__link`). If it is
`IMG…` or `DIV…content`, the link is covered and the card is dead.

Test the same way for interactive overlays that must **not** intercept: point at the hidden
quick-add button and confirm the hit falls through to the link, and that
`getComputedStyle(el).pointerEvents === 'none'`.

## Gate 5 — Multi-instance

A section that works once may break when used twice on a page. Temporarily add a second
instance to `templates/index.json`, then assert both are initialised:

```js
var roots = document.querySelectorAll('[data-slideshow]');
roots.length                       // 2
roots[0].hasAttribute('data-ready') // both true
```

Then click a control **inside the second instance** and confirm only that instance changes.
Revert `index.json` afterwards.

## Gate 6 — Batch push, verify remotely

```bash
bash scripts/sl.sh theme push --theme <unpublished-theme-id> --path ./theme
```

Confirm files actually landed rather than trusting the CLI message:

```bash
# Admin REST, list remote assets
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://<store>/admin/openapi/v20260901/themes/<id>/assets/list.json" | grep -o '"key":"[^"]*"'
```

---

## Probe mechanics that waste time if unknown

- **`--dump-dom` captures immediately after the `load` event.** Anything a `setTimeout`
  changes is not in the dump. Run probes synchronously inside a `load` listener.
- **`--virtual-time-budget` can hang** on tall pages. Prefer synchronous probes.
- **Headless Chrome has a minimum window width (~489 px).** A 390 px screenshot is a crop,
  not proof of a mobile layout bug. Read `document.documentElement.clientWidth` instead.
- **Online preview URLs are behind bot protection** for headless clients — they return a
  block page. Visual confirmation of the hosted theme must be done in a real browser; local
  serve is the automated proxy.
- **Clean up every probe.** Search for `PROBE` / `HIT` / `data-probe` before pushing.

---

## What local serve cannot verify

State these as "requires hosted verification" rather than claiming they pass:

| Feature | Why |
|---|---|
| Add to cart | `/cart/add` does not take effect locally |
| Cart with items | needs a real cart |
| Predictive search, product recommendations | `?section_id=` fragments are not implemented |
| Customer account pages | route 404s unless accounts are enabled on the store |
| Gift card | needs a real gift card code |
| Blog / article | needs at least one article |
