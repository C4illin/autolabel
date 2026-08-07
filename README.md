# autolabel

Labels pull requests based on [conventional commit](https://www.conventionalcommits.org/) PR titles.

`feat: add login page` → `feature` label, `fix!: rewrite auth` → `fix` + `breaking` labels, and so on. When a title is edited, labels the action previously added are removed if they no longer match. Labels not listed in `type_labels` are never touched.

These labels can then be used to group [automatically generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes) into categories. See this repo's [.github/release.yml](.github/release.yml) for an example.

## Usage

```yaml
name: autolabel
on:
  pull_request:
    types: [opened, edited, labeled, unlabeled]

permissions:
  pull-requests: write

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: c4illin/autolabel@v1
        with:
          type_labels: |
            feat: feature
            fix: fix
            docs: documentation
            style: style
            refactor: refactor
            perf: performance
            test: test
            build: build
            ci: ci
            revert: revert
            breaking: breaking
```

`type_labels` maps commit types to the label(s) to apply — one label or a list (`breaking: [breaking, major]`). The example shows the default mapping, so leave `with:` off entirely if it already suits you. The `breaking` entry is applied when the title contains `!` or the PR body has a `BREAKING CHANGE:` footer.

Remaining inputs, all optional:

- `ignore_label` — opts a PR out: no labels are added, and any the action added earlier are removed. Default: unset
- `create_missing_labels` — create labels that don't exist yet, colored from a built-in palette. Default: `true`
- `token` — defaults to `${{ github.token }}`

## Outputs

| Output           | Description                            |
| ---------------- | -------------------------------------- |
| `labels_added`   | JSON array of labels that were added   |
| `labels_removed` | JSON array of labels that were removed |

## Development

```sh
npm install
# typecheck + bundle to dist/
npm run all
```

`dist/` must be committed — GitHub runs `dist/index.mjs` directly from the repo. After changing `src/`, rerun `npm run all` and commit the result.
