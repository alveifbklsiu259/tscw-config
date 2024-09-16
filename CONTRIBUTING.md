# Contribution guide

Thank you for considering contributing to tscw-config.
Please consider these guidelines before making a pull request:

- Commits follow the [Conventional commit convention](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional)
- Features and bug fixes should be covered by test cases

## Semantically released

tscw-config uses [semantic-release](https://github.com/semantic-release/semantic-release)
to release new versions automatically.

- Commits of type `fix` will trigger bugfix releases, think `0.0.1`
- Commits of type `feat` will trigger feature releases, think `0.1.0`
- Commits with `BREAKING CHANGE` in body or footer will trigger breaking releases, think `1.0.0`

All other commit types will trigger no new release.

## Code Conventions

- Indent using tab.
- Tab size: 4.
- 120 character line length strongly preferred.
- Prefer double quotes.
- ES6 syntax when possible.
- Use [TypeScript](https://www.typescriptlang.org/).
- No Trailing commas.
