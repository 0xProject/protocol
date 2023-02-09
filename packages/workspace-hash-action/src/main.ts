import * as core from "@actions/core";
import { exec } from "@actions/exec";

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

async function run(): Promise<void> {
  try {
    const dir = core.getInput("dir").length ? core.getInput("dir") : null;
    const separator = core.getInput("separator");
    core.debug(JSON.stringify({ dir, separator }));

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
    const packages: { package: string; hash: string }[] = turboInfo.tasks
      .filter((task) => (dir ? task.directory.startsWith(`${dir}/`) : true))
      .map((task: Task) => ({
        package: task.package,
        hash: task.hash,
      }));

    core.setOutput(
      "workspace-hashes",
      packages.map((p) => `${p.package}${separator}${p.hash}`)
    );
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
