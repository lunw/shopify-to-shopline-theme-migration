# Contributing

Thanks for helping make this migration skill less wrong.

## What is useful

- **A rule that doesn't hold.** SHOPLINE changes; the catalog in `references/` reflects one
  migration at one point in time. If a documented behavior differs on your store, that's a
  bug in the skill.
- **A missing silent failure.** A case where a ported theme renders blank, empty, raw, or
  dead and the current catalog doesn't explain it.
- **A wrong mapping.** A field in `references/object-mapping.md` that doesn't exist, or that
  exists under a different name.

## How to report

Open an issue containing:

1. **Environment** — SHOPLINE CLI version (`sl --version`), the store plan/region, and the
   date. Behavior is version-sensitive.
2. **Minimal snippet** — the smallest template fragment that reproduces it.
3. **Expected vs actual** — what rendered, not what you expected to see in the DOM.
4. **Evidence** — a redacted screenshot, the rendered HTML fragment, or the `theme check`
   output. Never paste an access token, a merchant's product data, or a private store domain.

## How to send a change

1. Fork, branch, edit.
2. Keep the style: **symptom → cause → fix**, with a copy-pasteable snippet. Rules that
   cannot be stated as a failure mode belong in `references/syntax-mapping.md`, not in the
   top-ten list.
3. If you add a rule, say where it was observed (which theme, which store shape) so later
   readers can judge whether it still applies.
4. Open a PR describing the observed failure and the verification you ran.

## Scope

This repo is the **skill**, not a migration service. Issues asking for help migrating a
specific theme are welcome as discussions, but the deliverable here is documentation and
tooling.

## License

By contributing you agree that your contribution is licensed under the repository's MIT
license.
