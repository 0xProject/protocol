import { exec } from "@actions/exec";
import * as core from "@actions/core";
import { inspect } from "node:util";

// The output shape of `turbo run <task> --dry-run=json`,
// current os of Turborepo 1.7
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

async function run(): Promise<void> {
  const inputs = {
    pipeline: core.getInput("pipeline") // defaults to "build",
  };
  core.debug(`Inputs: ${inspect(inputs)}`);

  try {
    let dryRunOutput = "";
    await exec(
      '"./node_modules/.bin/turbo"',
      ["run", "build", "--dry-run=json"],
      {
        silent: true,
        listeners: {
          stdout: (data: Buffer) => {
            dryRunOutput += data.toString();
          },
        },
      }
    );

    const turboInfo: DryRunOutput = JSON.parse(dryRunOutput);
    core.debug(`Turbo dry run output: ${inspect(dryRunOutput)}`);

    core.setOutput('dry-run-output', turboInfo);
  } catch (error) {
    core.debug(inspect(error));
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
