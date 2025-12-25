/**
 * Script to regenerate contractsBytecode from compiled artifacts
 * Run: node scripts/generate-bytecode.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const artifactsDir = path.join(__dirname, '../artifacts/contracts');
const outputPathJS = path.join(__dirname, '../frontend/src/contractsBytecode.js');
const outputPathTS = path.join(__dirname, '../frontend-next/lib/contracts/contractsBytecode.ts');

// Read artifact and extract ABI + bytecode
function readArtifact(contractPath) {
    const fullPath = path.join(artifactsDir, contractPath);
    const artifact = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    return {
        abi: artifact.abi,
        bytecode: artifact.bytecode
    };
}

// Generate the bytecode file
const firstPrice = readArtifact('FirstPriceAuction.sol/FirstPriceAuction.json');
const vickrey = readArtifact('VickreyAuction.sol/VickreyAuction.json');
const dutch = readArtifact('DutchAuction.sol/DutchAuction.json');

const contracts = {
    firstPrice,
    vickrey,
    dutch
};

// Generate JS version (old frontend)
const outputJS = `export const CONTRACTS = ${JSON.stringify(contracts)};
`;
fs.writeFileSync(outputPathJS, outputJS);
console.log('✅ contractsBytecode.js regenerated successfully!');
console.log('   Path:', outputPathJS);

// Generate TS version (Next.js frontend)
const outputTS = `export const CONTRACTS = ${JSON.stringify(contracts, null, 2)};
`;
fs.writeFileSync(outputPathTS, outputTS);
console.log('✅ contractsBytecode.ts regenerated successfully!');
console.log('   Path:', outputPathTS);
