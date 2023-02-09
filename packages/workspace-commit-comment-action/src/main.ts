import { exec } from "@actions/exec";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { inspect } from "node:util";

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
  return `:${gitEmoji[index]}:`;
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

async function run(): Promise<void> {
  const inputs = {
    token: core.getInput("token"),
  };
  core.debug(`Inputs: ${inspect(inputs)}`);

  try {
    let dryRunOutput = "";
    await exec(
      '"./node_modules/.bin/turbo"',
      ["run", "build", "--dry-run=json"],
      {
        listeners: {
          stdout: (data: Buffer) => {
            dryRunOutput += data.toString();
          },
        },
      }
    );

    const turboInfo: DryRunOutput = JSON.parse(dryRunOutput);

    const topLevelPaths = turboInfo.tasks.reduce((result, { directory }) => {
      const topLevedPath = directory.split("/")[0];
      result.add(topLevedPath);
      return result;
    }, new Set<string>());

    let comment = `# Packages in this commit\n\n`;
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
    const commitSha = github.context.sha;

    core.debug(inspect({ owner, repo, commitSha, comment }));

    await octokit.rest.repos.createCommitComment({
      body: comment,
      commit_sha: commitSha,
      owner,
      repo,
    });
  } catch (error) {
    core.debug(inspect(error));
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
