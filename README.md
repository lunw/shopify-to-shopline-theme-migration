# Shopify → SHOPLINE Theme Migration Skill

[![tag](https://img.shields.io/badge/tag-Shopify%20to%20SHOPLINE%20theme%20migration-2ea44f)](#tags)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![platform](https://img.shields.io/badge/platform-SHOPLINE%20OS%203.0%20%C2%B7%20SLine-ff6a00)](#)
[![agent skill](https://img.shields.io/badge/agent%20skill-SKILL.md-8a2be2)](#install)

**Project tag: `Shopify to SHOPLINE theme migration`** · 项目标签：Shopify to SHOPLINE theme migration

An agent skill for porting a **Shopify theme template layer** to **SHOPLINE OS 3.0** (SLine),
distilled from a completed production migration: 253 files, 19 templates, 30 sections,
34 locales, and roughly twenty silent failure modes that make a ported theme *look*
finished while nothing actually works.

> **The short version:** syntax conversion is the easy 20%. The remaining 80% is that
> Shopify and SHOPLINE share object *names* but not always object *fields* — and a wrong
> field fails silently. `product.variants` is empty. `search.results` is empty.
> `item.url_to_remove` does not exist. None of these throw; the page just renders blank.

---

## Scope and boundaries

This skill migrates **the theme template layer only**. Read this before installing, because
"migrate my theme" is routinely read as "deliver a working store".

### In scope

- SLine syntax conversion (`{% schema %}` → `{{#schema}}`, `{% render %}` → `{{#component}}`, …)
- Section / block / component / template / layout file structure
- CSS variable and design-token alignment with SHOPLINE `base.css`
- Data-access logic for product, collection, cart, search, order, customer
- i18n **key** correctness across all locales (keys, not prose)

### Explicitly out of scope

| Not included | Meaning |
|---|---|
| **Content and media population** | No product copy, no banner images, no blog posts, no collection curation. The migrated theme ships with empty settings. |
| **Page ↔ template mapping** | No URL redirects, no assigning templates to pages, no navigation menus, no binding collections or products to sections. |
| **Pixel-perfect visual parity** | Fonts, spacing, breakpoints and interactions will differ. Treat the output as *structurally equivalent and visually re-tunable*. |
| Store configuration | Checkout, payments, shipping, apps, domain, tax. |

**After migration the theme must be rebuilt**: bind collections to sections, upload media,
create menus, assign templates to pages, configure theme settings, and enable customer
accounts if the account templates are to be used.

A migrated theme with no settings renders an empty store. That is the expected state, not a
defect. Do not promise pixel-level fidelity.

---

## Prerequisites

### Required

1. **SHOPLINE AI Suite installed in the agent.** All four matter:
   - `shopline-theme-development` — SLine syntax, tags, filters, objects, plus the docs
     search script. This is the only reliable way to resolve a doubtful tag.
   - `shopline-admin-rest` — confirm object fields and REST paths.
   - `shopline-store-ops` — authenticated calls against the real store.
   - `shopline-auth` — OAuth / token setup.
2. **SHOPLINE CLI (`sl`)**, logged in: `sl login --store <store>.myshopline.com`
3. **Source theme files on disk** — the full Shopify theme directory.
4. **A reference SHOPLINE theme** (Fashion1 is what this was validated against), cloned to
   `_reference/`. This is the highest-value asset in the whole process: when a field is in
   doubt, grep the official theme instead of guessing.

### Not required

**The Shopify AI toolkit is optional.** The migration never calls Shopify APIs — you convert
source files that already exist locally. Install it only if you want to look up Shopify-side
semantics (what a `{% schema %}` field means, how Liquid behaves). Omitting it changes
nothing about the migration outcome.

### The environment gotcha that costs an hour

If `HTTP_PROXY` / `HTTPS_PROXY` are set, every `sl` command returns **HTTP 400** — `whoami`,
`theme list`, `theme push`, `theme check` alike. It looks like an expired session. It is not,
and `sl login` will not fix it. `scripts/sl.sh` unsets the proxy variables for you; use it
for every CLI call.

---

## Install

```bash
# user-level (available in every project)
git clone https://github.com/lunw/shopify-to-shopline-theme-migration.git ~/.workbuddy-ai/skills/shopify-to-shopline-theme-migration

# or project-level
git clone https://github.com/lunw/shopify-to-shopline-theme-migration.git .workbuddy-ai/skills/shopify-to-shopline-theme-migration
```

The agent loads `SKILL.md` when a request matches its description; references are loaded on
demand.

---

## Structure

```
shopify-to-shopline-theme-migration/
├── SKILL.md                        # entry point: scope, workflow, top-10 rules
├── references/
│   ├── syntax-mapping.md           # Liquid tag / filter / schema → SLine
│   ├── object-mapping.md           # every product/collection/cart/search/order field
│   ├── pitfalls.md                 # symptom → cause → fix catalog
│   └── verification.md             # gates: check, i18n, render, hit-test, push
└── scripts/
    ├── sl.sh                       # proxy-safe SHOPLINE CLI wrapper
    └── audit-i18n.mjs              # every t() key vs every locale
```

---

## Quick start

```bash
# 0. inventory
find ./shopify-theme -name "*.liquid" | wc -l

# 1. port tokens first, not sections
#    layout/theme.html, config/settings_schema.json, components/theme-css-var.html

# 2. port sections in dependency order, push in batches
bash scripts/sl.sh theme check --path ./theme
bash scripts/sl.sh theme push --theme <unpublished-id> --path ./theme

# 3. audit the data layer against the official theme
#    → references/object-mapping.md, field by field

# 4. gates
node scripts/audit-i18n.mjs ./theme
bash scripts/sl.sh theme serve      # then hit-test clicks, not just markup
```

---

## The ten rules that break silently

1. `t()` returns the key when missing — `| default()` does **not** rescue it. Audit every locale.
2. `money()` returns HTML — use `{{{ }}}`. Same for `richtext`.
3. Arrays have no `.size` — `{{ list | size() }}`.
4. `product.variants` is empty in sections — `product | get_variants()`; variants have
   `option1/2/3`, no `options` array.
5. `{{#blocks}}` has no `forloop` — never derive an index inside a block.
6. A block must be its own file (`sections/x/blocks/y.html`, type `$y`).
7. `image_url` takes the image object, not `.src`.
8. `date()` needs `date(format = "…")` — the named argument.
9. The search parameter is **`keyword`**, not `q`; results come from
   `search | get_search_pagination(n)`.
10. `collection.url` loses the handle on `/collections/all` — use `request.path`.

---

## Evidence

Validated on a live SHOPLINE store against the official Fashion1 theme. Outcomes after
applying this skill: `theme check` 0 offenses across 253 files; every `t()` key present in
all 34 locales; product images, variant selection, collection filters, search, cart removal
and product-card navigation all verified by DOM hit-testing rather than by reading markup.

---

## 中文说明

**适用范围：仅主题模板层迁移。**

- ✅ 做：SLine 语法转换、文件结构、CSS 变量与设计令牌对齐、商品/集合/购物车/搜索/订单的
  数据访问逻辑、i18n 键的完整性。
- ❌ 不做：新主题的素材与内容填充；页面与模板的映射迁移（URL 重定向、模板分配、导航菜单、
  集合绑定）；不承诺像素级还原。

**迁移完成后需要重新搭建主题**：绑定集合、上传图片、创建菜单、给页面分配模板、配置主题设置。
迁移出来的主题在没有配置的情况下就是空商店，这是预期状态，不是 bug。

**前置条件**：智能体中安装 SHOPLINE AI Suite（`shopline-theme-development`、
`shopline-admin-rest`、`shopline-store-ops`、`shopline-auth`），并登录 SHOPLINE CLI。
**Shopify 官方 toolkit 不是必需的** —— 迁移过程不调用任何 Shopify 接口，只转换本地已有的源文件。

---

## Tags

Canonical tag: **Shopify to SHOPLINE theme migration** · 项目标签：Shopify to SHOPLINE theme migration

GitHub repository topics (topics cannot contain spaces, so the tag is split into searchable
terms):

`shopify` · `shopline` · `theme-migration` · `shopify-to-shopline` · `sline` · `liquid` ·
`theme-conversion` · `agent-skill` · `ai-agent` · `ecommerce`

---

## Contributing

Every rule in this skill is meant to be falsifiable. If a rule is wrong on your store, open
an issue with the SHOPLINE CLI/docs version, the exact template snippet, and what actually
rendered — see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT. The pitfall catalog reflects one real migration; SHOPLINE's platform evolves, so
re-verify a rule against the current docs before treating it as permanent.
