import * as core from "@actions/core";
import * as github from "@actions/github";
import * as yaml from "js-yaml";

// Matches conventional commit titles: "type(optional scope)!: subject"
const TITLE_PATTERN = /^(?<type>[A-Za-z]+)(?:\((?<scope>[^)]*)\))?(?<breaking>!)?:/;

// Conventional commits spec: a "BREAKING CHANGE:"/"BREAKING-CHANGE:" footer
// marks a breaking change even without "!" in the title.
const BREAKING_BODY_PATTERN = /^BREAKING[ -]CHANGE:/m;

type Octokit = ReturnType<typeof github.getOctokit>;

interface Config {
  typeLabels: Record<string, string[]>;
  ignoreLabel: string;
  createMissingLabels: boolean;
}

// Values may be a single label ("Feature") or a list (["Feature", "..."]).
function normalizeTypeLabels(raw: Record<string, string | string[]>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(raw).map(([type, labels]) => [type, Array.isArray(labels) ? labels : [labels]]),
  );
}

// Inputs are parsed as YAML; JSON is valid YAML, so both
// '{"feat": ["feature"]}' and a multi-line "feat: feature" block work.
// js-yaml throws on empty input, so blank inputs skip parsing.
function yamlInput(name: string): unknown {
  const raw = core.getInput(name);
  return raw.trim() ? yaml.load(raw) : undefined;
}

function loadConfig(): Config {
  return {
    typeLabels: normalizeTypeLabels(
      (yamlInput("type_labels") ?? {}) as Record<string, string | string[]>,
    ),
    ignoreLabel: core.getInput("ignore_label"),
    createMissingLabels: core.getBooleanInput("create_missing_labels"),
  };
}

async function ensureLabelsExist(octokit: Octokit, labels: string[]): Promise<void> {
  const { owner, repo } = github.context.repo;
  const existing = await octokit.paginate(octokit.rest.issues.listLabelsForRepo, {
    owner,
    repo,
    per_page: 100,
  });
  const existingNames = new Set(
    existing.map((label: { name: string }) => label.name.toLowerCase()),
  );
  for (const name of labels) {
    if (existingNames.has(name.toLowerCase())) continue;
    await octokit.rest.issues.createLabel({
      owner,
      repo,
      name,
      description: "Created by autolabel",
    });
    core.info(`Created missing label "${name}"`);
  }
}

export async function run(): Promise<void> {
  const pr = github.context.payload.pull_request;
  if (!pr) {
    core.info("This event is not a pull_request, nothing to do.");
    return;
  }

  const octokit = github.getOctokit(core.getInput("token", { required: true }));
  const config = loadConfig();

  const currentLabels: string[] = (pr.labels ?? []).map((label: { name: string }) => label.name);

  // With the ignore label present, desired stays empty: no labels are
  // added and previously added managed labels are removed below.
  const ignored = Boolean(config.ignoreLabel) && currentLabels.includes(config.ignoreLabel);

  const title: string = pr.title ?? "";
  const match = TITLE_PATTERN.exec(title);

  const desired = new Set<string>();
  if (ignored) {
    core.info(`PR has the "${config.ignoreLabel}" label, removing managed labels.`);
  } else if (match?.groups) {
    const type = match.groups.type.toLowerCase();
    for (const label of config.typeLabels[type] ?? []) desired.add(label);
    // Breaking labels apply even when the type itself is unmapped.
    const breaking = Boolean(match.groups.breaking) || BREAKING_BODY_PATTERN.test(pr.body ?? "");
    if (breaking) {
      for (const label of config.typeLabels["breaking"] ?? []) desired.add(label);
    }
  } else {
    core.info(`Title "${title}" is not a conventional commit title.`);
  }

  // Only ever touch labels this action manages, so manually added
  // labels outside type_labels are left alone.
  const managed = new Set<string>(Object.values(config.typeLabels).flat());

  const toAdd = [...desired].filter((label) => !currentLabels.includes(label));
  const toRemove = currentLabels.filter((label) => managed.has(label) && !desired.has(label));

  const { owner, repo } = github.context.repo;

  if (toAdd.length > 0) {
    if (config.createMissingLabels) {
      await ensureLabelsExist(octokit, toAdd);
    }
    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: pr.number,
      labels: toAdd,
    });
    core.info(`Added labels: ${toAdd.join(", ")}`);
  }

  for (const label of toRemove) {
    await octokit.rest.issues.removeLabel({
      owner,
      repo,
      issue_number: pr.number,
      name: label,
    });
    core.info(`Removed label: ${label}`);
  }

  core.setOutput("labels_added", JSON.stringify(toAdd));
  core.setOutput("labels_removed", JSON.stringify(toRemove));
}

run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
