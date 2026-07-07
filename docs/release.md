# Date Picker Package Release Process

This runbook prepares `@schedulespark/date-picker` for npm publishing.

## Release Gates

Complete these checks before the first publish and before every subsequent beta:

- Package metadata: name, exports, `files`, license, repository, and `publishConfig`.
- README: install instructions, styling import, usage, options, keyboard navigation, and screenshots.
- Changelog: a release entry exists for the version being published.
- API review: public exports are reviewed for stability and documented in `docs/public-api-review.md`.
- Security review: dependency and package-content checks are recorded in `docs/security-review.md`.
- CI: package test, typecheck, lint, and build jobs pass.
- Standalone check: `pnpm --filter @schedulespark/date-picker pack --dry-run` inspected in isolation; zero `@schedulespark/*` and zero third-party runtime dependencies in `package.json`.

## Version Approval

Do not change `packages/date-picker/package.json` `version` without explicit approval from the maintainer. Version bumps are release decisions, not incidental cleanup.

## Prepublish Commands

Run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @schedulespark/date-picker test
pnpm --filter @schedulespark/date-picker typecheck
pnpm --filter @schedulespark/date-picker lint
pnpm --filter @schedulespark/date-picker build
pnpm --filter @schedulespark/date-picker pack --dry-run
```

Inspect the dry-run package file list. It should include `package.json`, `dist`, README, license, changelog, and package docs.

## Publish Command

After version approval and all release gates pass:

```bash
pnpm --filter @schedulespark/date-picker publish --access public --tag beta
```
