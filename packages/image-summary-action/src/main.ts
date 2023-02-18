import * as core from "@actions/core";
import { exec } from "@actions/exec";
import { inspect } from "node:util";
import * as github from "@actions/github";
import gitEmoji from "./gitEmoji.json";

// TODO (rhinodavid): This is copied across packages. Consider extracting.
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

export interface AwsImageResult {
  imageDetails: ImageDetail[];
}

export interface ImageDetail {
  registryId: string;
  repositoryName: string;
  imageDigest: string;
  imageTags: string[];
  imageSizeInBytes: number;
  imagePushedAt: string;
  imageScanStatus: ImageScanStatus;
  imageScanFindingsSummary: ImageScanFindingsSummary;
  imageManifestMediaType: string;
  artifactMediaType: string;
  lastRecordedPullTime: string;
}

export interface ImageScanFindingsSummary {
  imageScanCompletedAt: string;
  vulnerabilitySourceUpdatedAt: string;
  findingSeverityCounts: FindingSeverityCounts;
}

export interface FindingSeverityCounts {}

export interface ImageScanStatus {
  status: string;
  description: string;
}

async function checkForImage(imageTag: string): Promise<AwsImageResult | null> {
  let output = "";
  let error = "";
  const exitCode = await exec(
    "aws",
    [
      "ecr",
      "describe-images",
      "--repository-name",
      "apps",
      "--image-ids",
      `imageTag=${imageTag}`,
    ],
    {
      silent: true,
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        },
        stderr: (data: Buffer) => {
          error += data.toString();
        },
      },
    }
  );
  if (exitCode !== 0) {
    core.debug(`Image with tag ${imageTag} not found`);
    core.debug(`Error: ${error}`);
    return null;
  } else {
    core.debug(`Image with tag ${imageTag} found`);
    return JSON.parse(output);
  }
}

async function run(): Promise<void> {
  try {
    const inputs = {
      dryRunResult: core.getInput("dry-run-result"),
      dir: core.getInput("dir").length ? core.getInput("dir") : null,
      token: core.getInput("token"),
      uriBase: core.getInput("uri-base") ?? "",
    };
    core.debug(`Inputs: ${inspect(inputs)}`);

    const dryRunResult: DryRunOutput = JSON.parse(inputs.dryRunResult);

    const packages: { package: string; hash: string }[] = dryRunResult.tasks
      .filter((task) =>
        inputs.dir ? task.directory.startsWith(`${inputs.dir}/`) : true
      )
      .map((task: Task) => ({
        package: task.package,
        hash: task.hash,
      }));

    const imageInfoResults = await Promise.allSettled(
      packages.map(async (p) => {
        const imageInfo = await checkForImage(`${p.package}__${p.hash}`);
        return {
          packageName: p.package,
          turboHash: p.hash,
          imagePushedAt: imageInfo?.imageDetails[0]?.imagePushedAt,
          imageSizeBytes: imageInfo?.imageDetails[0]?.imageSizeInBytes,
          tags: imageInfo?.imageDetails[0]?.imageTags || [],
        };
      })
    );

    let comment: string[] = [`## :floppy_disk: Image Summary`];
    comment.push("> These images reflect the code in this commit.");
    imageInfoResults
      .filter((r) => r.status === "fulfilled" && r.value.tags)
      .forEach((r) => {
        if (r.status !== "fulfilled") {
          return;
        }
        const { packageName, tags, turboHash, imagePushedAt, imageSizeBytes } = r.value;
        comment.push(`### \`${packageName}\` ${hashmoji(turboHash)}`);
        if (tags.length) {
          tags.forEach((tag) => {
            comment.push(`- \`${inputs.uriBase}:${tag}\``);
          });
        }
        if (imagePushedAt) {
          const date = new Date(imagePushedAt);
          if (!isNaN(date.getTime())) {
          comment.push(`<sub>Pushed at: ${date.toUTCString()}</sub>`);
          }
        }
        if (imageSizeBytes) {
         const imageSizeKb = Math.round(imageSizeBytes / 1000);
          comment.push(`<sub>Size: ${imageSizeKb} kB</sub>`);
        }
        comment.push("");
        return;
      });

    const failureReasons: string[] = [];
    imageInfoResults
      .filter((r) => r.status === "rejected")
      .forEach((r) => {
        if (r.status === "rejected") {
          failureReasons.push(inspect(r.reason));
        }
      });

    if (failureReasons.length) {
      comment.push("## ☢️ Errors checking images");
      failureReasons.forEach((reason) => {
        comment.push(`- ${reason}`);
      });
    }

    const octokit = github.getOctokit(inputs.token);

    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;

    let sha: string;

    if (github.context.eventName === "pull_request") {
      const pullRequestPayload = github.context.payload;
      const prSha = pullRequestPayload.pull_request!.head.sha;
      sha = prSha;
      core.info(`Pull request commit is: ${prSha}`);
    } else {
      const contextSha = github.context.sha;
      sha = contextSha;
      core.info(
        `Ran because of event ${github.context.eventName}, sha: ${sha}`
      );
    }

    core.debug(inspect({ owner, repo, sha, comment }));

    await octokit.rest.repos.createCommitComment({
      body: comment.join("\n"),
      commit_sha: sha,
      owner,
      repo,
    });
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
