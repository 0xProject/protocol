import path from 'path';
import fs from 'fs';
import { globSync } from 'glob';

function getDeployedBytecode(contractOrInterfaceName: string) {
    const artifactPath = `out/${contractOrInterfaceName}.sol/${contractOrInterfaceName}.json`;
    const artifact = JSON.parse(fs.readFileSync(artifactPath).toString());
    return artifact.deployedBytecode.object;
}

async function main() {
    const solidityFilePaths = globSync(__dirname + '/../**/PoolFetcher.sol');

    const contractOrInterfaceNames = solidityFilePaths.map((filePath) => {
        const baseName = path.basename(filePath);
        const contractOrInterfaceName = baseName.substring(0, baseName.length - 4);
        return contractOrInterfaceName;
    });

    const keyValues = contractOrInterfaceNames
        .map((name) => {
            const deployedBytecode = getDeployedBytecode(name);
            return `${name}: '${deployedBytecode}'`;
        })
        .join(',\n');

    const data = `export const deployedBytecode = { ${keyValues} }`;

    fs.writeFileSync('src/artifacts/index.ts', data);
    console.log('Successfully wrote src/artifacts/index.ts');
}

main();
