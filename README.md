# autolabel

Labels pull requests based on [conventional commit](https://www.conventionalcommits.org/) PR titles.

`feat: add login page` → `feature` label, `fix!: rewrite auth` → `fix` + `breaking` labels, and so on. When a title is edited, labels the action previously added are removed if they no longer match. Labels not listed in `type_labels` are never touched.

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

All inputs are optional:

| Input                   | Description                                                                      | Default                 |
| ----------------------- | -------------------------------------------------------------------------------- | ----------------------- |
| `type_labels`           | Map of commit types to the label(s) to apply                                     | the mapping shown above |
| `ignore_label`          | Opts a PR out: no labels are added, and any the action added earlier are removed | unset                   |
| `create_missing_labels` | Create labels that don't exist in the repo yet (GitHub picks their colors)       | `true`                  |
| `token`                 | GitHub token used to add/remove labels                                           | `${{ github.token }}`   |

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

`dist/` must be committed since GitHub runs `dist/index.mjs` directly from the repo.
