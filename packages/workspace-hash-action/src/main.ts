import * as core from '@actions/core';
import { exec } from '@actions/exec';
import { inspect } from 'node:util';

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
        const inputs = {
            dryRunResult: core.getInput('dry-run-result'),
            dir: core.getInput('dir').length ? core.getInput('dir') : null,
            separator: core.getInput('separator'),
        };
        core.debug(`Inputs: ${inspect(inputs)}`);

        const turboInfo: DryRunOutput = JSON.parse(inputs.dryRunResult);
        const packages: { package: string; hash: string }[] = turboInfo.tasks
            .filter((task) => (inputs.dir ? task.directory.startsWith(`${inputs.dir}/`) : true))
            .map((task: Task) => ({
                package: task.package,
                hash: task.hash,
            }));

        core.setOutput(
            'workspace-hashes',
            packages.map((p) => `${p.package}${inputs.separator}${p.hash}`),
        );
    } catch (error) {
        if (error instanceof Error) core.setFailed(error.message);
    }
}

run();
