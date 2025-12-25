import fs from 'fs';
import path from 'path';

// Read the compiled artifacts
const firstPriceArtifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../artifacts/contracts/FirstPriceAuction.sol/FirstPriceAuction.json'), 'utf8')
);

// Extract ABI and bytecode
const abi = firstPriceArtifact.abi;
const bytecode = firstPriceArtifact.bytecode;

// Generate the TypeScript file
const output = `// Auto-generated contract bytecode - ${new Date().toISOString()}
// DO NOT EDIT MANUALLY - Run 'npm run update-bytecode' to regenerate

export const CONTRACTS = {
    firstPrice: {
        abi: ${JSON.stringify(abi, null, 4)},
        bytecode: "${bytecode}"
    }
};
`;

// Write to file
const outputPath = path.join(__dirname, '../frontend-next/lib/contracts/contractsBytecode.ts');
fs.writeFileSync(outputPath, output);

console.log('✅ Updated contractsBytecode.ts with latest compiled bytecode');
console.log(`   File: ${outputPath}`);
console.log(`   Bytecode length: ${bytecode.length} characters`);
