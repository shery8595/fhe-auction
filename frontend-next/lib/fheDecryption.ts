/**
 * FHE Decryption Utilities for FHEVM v0.9
 * 
 * This module provides utilities for the new self-relaying decryption workflow.
 * In v0.9, the dApp client is responsible for:
 * 1. Fetching encrypted values from the blockchain
 * 2. Calling the FHE SDK's publicDecrypt() to decrypt them off-chain
 * 3. Submitting the clear values + proof back to the smart contract
 */

import { getFHEInstance } from "./fhevm";

/**
 * Result from the public decryption process
 */
export interface PublicDecryptResult {
    /** Clear values indexed by their encrypted handle */
    clearValues: Record<string, any>;
    /** ABI-encoded clear values (for on-chain verification) */
    abiEncodedClearValues: string;
    /** KMS signature proof */
    decryptionProof: string;
}

/**
 * Decrypt encrypted values using the FHE SDK
 * 
 * @param encryptedHandles Array of encrypted handles (as hex strings)
 * @returns Decryption result with clear values and proof
 * 
 * @example
 * ```typescript
 * const handles = [winnerIndexHandle, winningBidHandle];
 * const result = await publicDecrypt(handles);
 * 
 * // Extract clear values
 * const clearIndex = result.clearValues[handles[0]];
 * const clearBid = result.clearValues[handles[1]];
 * 
 * // Submit to contract
 * await contract.revealWinner(
 *   clearIndex,
 *   clearBid,
 *   result.abiEncodedClearValues,
 *   result.decryptionProof
 * );
 * ```
 */
export async function publicDecrypt(
    encryptedHandles: string[]
): Promise<PublicDecryptResult> {
    if (encryptedHandles.length === 0) {
        throw new Error("No encrypted handles provided");
    }

    console.log("🔐 Requesting public decryption from FHE SDK...");
    console.log("   Handles:", encryptedHandles);

    try {
        // Get the FHE instance
        const fheInstance = await getFHEInstance();
        if (!fheInstance) {
            throw new Error("FHE instance not initialized");
        }

        // Use the SDK's built-in publicDecrypt method
        // This handles all relayer communication internally
        const result = await fheInstance.publicDecrypt(encryptedHandles);

        console.log("✅ Decryption successful!");
        console.log("   Result structure:", {
            hasClearValues: !!result?.clearValues,
            hasAbiEncoded: !!result?.abiEncodedClearValues,
            hasProof: !!result?.decryptionProof,
        });

        return {
            clearValues: result.clearValues || {},
            abiEncodedClearValues: result.abiEncodedClearValues || "0x",
            decryptionProof: result.decryptionProof || "0x",
        };

    } catch (error: any) {
        console.error("❌ Public decryption failed:", error);

        // Check if it's the "not allowed for public decryption" error
        if (error.message?.includes("not allowed for public decryption")) {
            throw new Error(
                "The encrypted values are not yet ready for decryption. " +
                "Please wait 10-30 seconds after ending the auction for the KMS to process the makePubliclyDecryptable request, then try again."
            );
        }

        throw new Error(`Failed to decrypt: ${error.message}`);
    }
}

/**
 * Decrypt auction winner results (index + bid)
 * 
 * @param winnerIndexHandle Encrypted winner index handle
 * @param winningBidHandle Encrypted winning bid handle
 * @returns Object with decrypted index, bid, and proof data
 */
export async function decryptAuctionWinner(
    winnerIndexHandle: string,
    winningBidHandle: string
): Promise<{
    decryptedIndex: number;
    decryptedBid: bigint;
    abiEncodedClearValues: string;
    decryptionProof: string;
}> {
    console.log("🎯 Decrypting auction winner...");

    // IMPORTANT: Order matters! Must match the order in the smart contract
    const handles = [winnerIndexHandle, winningBidHandle];

    const result = await publicDecrypt(handles);

    // Extract clear values
    const clearIndex = result.clearValues[winnerIndexHandle];
    const clearBid = result.clearValues[winningBidHandle];

    if (clearIndex === undefined || clearBid === undefined) {
        console.error("❌ Decryption result missing expected values");
        console.error("   Available keys:", Object.keys(result.clearValues));
        throw new Error("Decryption result missing expected values");
    }

    console.log("   Winner Index:", clearIndex);
    console.log("   Winning Bid:", clearBid);

    return {
        decryptedIndex: Number(clearIndex),
        decryptedBid: BigInt(clearBid),
        abiEncodedClearValues: result.abiEncodedClearValues,
        decryptionProof: result.decryptionProof,
    };
}

/**
 * Check if the FHE SDK is available
 */
export async function checkFHEAvailability(): Promise<boolean> {
    try {
        const instance = await getFHEInstance();
        return !!instance;
    } catch {
        return false;
    }
}
