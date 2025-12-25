// Chainlink Automation Utilities for FHE Auction Platform
// Handles registration and management of Chainlink Upkeeps

import { ethers } from 'ethers';

// ========================================
// Constants
// ========================================

// Chainlink Automation Registry on Sepolia
export const CHAINLINK_REGISTRY_ADDRESS = "0x86EFBD0b6736Bed994962f9797049422A3A8E8Ad";

// Chainlink Automation Registrar on Sepolia (NEW - used for registration)
export const CHAINLINK_REGISTRAR_ADDRESS = "0xb0E49c5D0d05cbc241d68c05BC5BA1d1B7B72976";

// Chainlink LINK Token on Sepolia
export const LINK_TOKEN_ADDRESS = "0x779877A7B0D9E8603169DdbD7836e478b4624789";

// Minimum LINK balance required (5 LINK for registration)
export const MIN_LINK_BALANCE = ethers.parseEther("5");

// ========================================
// ABIs
// ========================================

// Minimal ABI for Chainlink Registrar (NEW - for registration)
export const CHAINLINK_REGISTRAR_ABI = [
    {
        "inputs": [
            {
                "components": [
                    { "internalType": "string", "name": "name", "type": "string" },
                    { "internalType": "bytes", "name": "encryptedEmail", "type": "bytes" },
                    { "internalType": "address", "name": "upkeepContract", "type": "address" },
                    { "internalType": "uint32", "name": "gasLimit", "type": "uint32" },
                    { "internalType": "address", "name": "adminAddress", "type": "address" },
                    { "internalType": "uint8", "name": "triggerType", "type": "uint8" },
                    { "internalType": "bytes", "name": "checkData", "type": "bytes" },
                    { "internalType": "bytes", "name": "triggerConfig", "type": "bytes" },
                    { "internalType": "bytes", "name": "offchainConfig", "type": "bytes" },
                    { "internalType": "uint96", "name": "amount", "type": "uint96" }
                ],
                "internalType": "struct RegistrationParams",
                "name": "requestParams",
                "type": "tuple"
            }
        ],
        "name": "registerUpkeep",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Minimal ABI for LINK Token
export const LINK_TOKEN_ABI = [
    {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            { "name": "_spender", "type": "address" },
            { "name": "_value", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "name": "success", "type": "bool" }],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            { "name": "_owner", "type": "address" },
            { "name": "_spender", "type": "address" }
        ],
        "name": "allowance",
        "outputs": [{ "name": "remaining", "type": "uint256" }],
        "type": "function"
    }
];

// ========================================
// Functions
// ========================================

/**
 * Check admin's LINK token balance
 */
export async function checkLinkBalance(
    provider: ethers.Provider,
    address: string
): Promise<bigint> {
    try {
        const linkToken = new ethers.Contract(
            LINK_TOKEN_ADDRESS,
            LINK_TOKEN_ABI,
            provider
        );

        const balance = await linkToken.balanceOf(address);
        return balance;
    } catch (error) {
        console.error("Error checking LINK balance:", error);
        throw new Error("Failed to check LINK balance");
    }
}

/**
 * Register an auction with Chainlink Automation
 * Uses the new Registrar contract with two-step process:
 * 1. Approve LINK tokens for Registrar
 * 2. Call registerUpkeep on Registrar
 */
export async function registerUpkeep(
    signer: ethers.Signer,
    auctionAddress: string,
    auctionEndTime: number,
    auctionTitle: string
): Promise<string> {
    try {
        const linkToken = new ethers.Contract(
            LINK_TOKEN_ADDRESS,
            LINK_TOKEN_ABI,
            signer
        );

        const registrar = new ethers.Contract(
            CHAINLINK_REGISTRAR_ADDRESS,
            CHAINLINK_REGISTRAR_ABI,
            signer
        );

        const adminAddress = await signer.getAddress();
        const linkAmount = ethers.parseEther("5"); // 5 LINK for registration

        // Step 1: Check current allowance
        console.log("Checking LINK allowance...");
        const currentAllowance = await linkToken.allowance(adminAddress, CHAINLINK_REGISTRAR_ADDRESS);

        // Step 2: Approve LINK tokens if needed
        if (currentAllowance < linkAmount) {
            console.log("Approving LINK tokens for Registrar...");
            const approveTx = await linkToken.approve(CHAINLINK_REGISTRAR_ADDRESS, linkAmount);
            console.log("Waiting for approval confirmation...");
            await approveTx.wait();
            console.log("✅ LINK tokens approved!");
        } else {
            console.log("✅ LINK tokens already approved!");
        }

        // Step 3: Register upkeep with Registrar
        console.log("Registering upkeep with Chainlink Registrar...");

        // Create the registration params struct
        const registrationParams = {
            name: `FHE Auction: ${auctionTitle}`,
            encryptedEmail: "0x",
            upkeepContract: auctionAddress,
            gasLimit: 500000,
            adminAddress: adminAddress,
            triggerType: 0,
            checkData: "0x",
            triggerConfig: "0x",
            offchainConfig: "0x",
            amount: linkAmount
        };

        // Pass the struct as a single parameter
        const tx = await registrar.registerUpkeep(registrationParams);

        console.log("Waiting for registration confirmation...");
        const receipt = await tx.wait();

        // Extract upkeep ID from return value or events
        let upkeepId = "0x0";

        // Try to get from transaction logs
        for (const log of receipt.logs) {
            try {
                if (log.topics.length > 1) {
                    upkeepId = log.topics[1];
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        console.log(`✅ Upkeep registered! ID: ${upkeepId}`);
        return upkeepId;
    } catch (error: any) {
        console.error("Error registering upkeep:", error);

        // Provide helpful error messages
        if (error.message.includes("insufficient funds") || error.message.includes("insufficient balance")) {
            throw new Error("Insufficient LINK balance. Get testnet LINK from https://faucets.chain.link/sepolia");
        } else if (error.message.includes("execution reverted")) {
            throw new Error("Registration failed. Make sure you have at least 5 LINK tokens and the auction contract is valid.");
        }

        throw new Error(`Failed to register upkeep: ${error.message}`);
    }
}

/**
 * Format LINK balance for display
 */
export function formatLinkBalance(balance: bigint): string {
    return ethers.formatEther(balance);
}

/**
 * Check if admin has sufficient LINK balance
 */
export function hasSufficientLink(balance: bigint): boolean {
    return balance >= MIN_LINK_BALANCE;
}

/**
 * Get Chainlink dashboard URL for upkeep
 */
export function getChainlinkDashboardUrl(upkeepId: string): string {
    return `https://automation.chain.link/sepolia/${upkeepId}`;
}
