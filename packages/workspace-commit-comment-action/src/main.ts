import { exec } from "@actions/exec";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { inspect } from "node:util";
import { PullRequestEvent } from "@octokit/webhooks-definitions/schema";

import gitEmoji from "./gitEmoji.json";

// The output shape of `turbo run <task> --dry-run=json`
export interface DryRunOutput {
  packages: string[];
  tasks: Task[];
}

export interface Task {
  taskId: string;
  task: string;
  package: string;
  hash: string;
  cacheState: {
    local: boolean;
    remote: boolean;
  };
  command: string;
  outputs: string[];
  excludedOutputs: null;
  logFile: string;
  directory: string;
  dependencies: string[];
  dependents: string[];
}

// TODO (rhinodavid): Import the JSON as const once
// https://github.com/microsoft/TypeScript/issues/32063 is resolved
type GithubEmoji = typeof gitEmoji extends Array<infer T> ? T : never;

// Hashes `input` and outputs a GitHub emoji
// string :alien:
//
// CAUTION: This is not a cryptographically secure hash function.
// DO NOT USE FOR SECRUITY CRITICAL APPLICATIONS.
function hashmoji(input: string): GithubEmoji {
  const hash = input.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  const index = Math.abs(hash) % gitEmoji.length;
  const result = `:${gitEmoji[index]}:`;
  core.debug(`Hashmoji for ${input} is ${result}`);
  return result;
}

function createDirectoryTable(directoryName: string, tasks: Task[]): string {
  let result = `## ${directoryName}\n`;
  result += `| Workspace | Turbo Hash |\n`;
  result += `| :--- | ---: |\n`;
  tasks.forEach((task) => {
    const regex = new RegExp(`^${directoryName}\/(?<workspace>.*)$`);
    const workspace = regex.exec(task.directory)?.groups?.workspace;
    if (!workspace) return;
    result += `| ${workspace} | ${hashmoji(task.hash)} \`${task.hash}\`|\n`;
  });
  return `\n${result}`;
}

function areNamesConsistent(dryRunOutput: DryRunOutput): boolean {
  const { tasks } = dryRunOutput;
  return tasks
    .map((task) => {
      const pathMembers = task.directory.split("/");
      const directoryName = pathMembers[pathMembers.length - 1];
      const isConsistent = directoryName === task.package;
      if (!isConsistent) {
        core.warning(
          `Workspace name "${task.package}" does not match directory "${directoryName}" in ${task.directory}`
        );
      }
      return isConsistent;
    })
    .every((isConsistent) => isConsistent);
}

async function run(): Promise<void> {
  const inputs = {
    dryRunResult: core.getInput("dry-run-result"),
    token: core.getInput("token"),
    requireConsistentNames: core.getBooleanInput("require-consistent-names"),
  };
  core.debug(`Inputs: ${inspect(inputs)}`);

  let sha: string;

  if (github.context.eventName === "pull_request") {
    const pullRequestPayload = github.context.payload as PullRequestEvent;
    const prSha = pullRequestPayload.pull_request.head.sha;
    sha = prSha;
    core.info(`Pull request commit is: ${prSha}`);
  } else {
    const contextSha = github.context.sha;
    sha = contextSha;
    core.info(`Ran because of event ${github.context.eventName}, sha: ${sha}`);
  }

  try {
    const turboInfo: DryRunOutput = JSON.parse(inputs.dryRunResult);

    if (inputs.requireConsistentNames) {
      if (!areNamesConsistent(turboInfo)) {
        core.setFailed("Workspace names are not consistent with package names");
      }
    }

    const topLevelPaths = turboInfo.tasks.reduce((result, { directory }) => {
      const topLevelPath = directory.split("/")[0];
      result.add(topLevelPath);
      return result;
    }, new Set<string>());

    let comment = `# Workspaces in this commit\n\n`;
    Array.from(topLevelPaths)
      .sort()
      .forEach((topLevelPath) => {
        comment += createDirectoryTable(
          topLevelPath,
          turboInfo.tasks.sort((a, b) => {
            if (a.directory < b.directory) {
              return -1;
            }
            if (a.directory > b.directory) {
              return 1;
            }
            return 0;
          })
        );
      });

    const octokit = github.getOctokit(inputs.token);

    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;

    core.debug(inspect({ owner, repo, sha, comment }));

    await octokit.rest.repos.createCommitComment({
      body: comment,
      commit_sha: sha,
      owner,
      repo,
    });
  } catch (error) {
    core.debug(inspect(error));
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
