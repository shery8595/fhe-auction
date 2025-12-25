"use client";

// Declare global window types for script-loaded SDK
declare global {
    interface Window {
        RelayerSDK?: {
            initSDK: () => Promise<void>;
            createInstance: (config: any) => Promise<any>;
            SepoliaConfig: any;
        };
        relayerSDK?: {
            initSDK: () => Promise<void>;
            createInstance: (config: any) => Promise<any>;
            SepoliaConfig: any;
        };
    }
}

let fheInstance: any | null = null;
let initializationPromise: Promise<any> | null = null;

/**
 * Get or create the FHE instance using script-loaded SDK from window.RelayerSDK
 * This is the ONLY supported way to use the Relayer SDK in frontend apps
 */
export async function getFHEInstance(): Promise<any> {
    if (fheInstance) return fheInstance;

    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
        try {
            // Wait for SDK to be loaded from CDN script tag
            let attempts = 0;
            const maxAttempts = 100; // 10 seconds max wait

            while (!window.RelayerSDK && !window.relayerSDK && attempts < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 100));
                attempts++;
            }

            // Check for both uppercase and lowercase versions
            const sdk = window.RelayerSDK || window.relayerSDK;

            if (!sdk) {
                throw new Error("RelayerSDK not loaded from CDN. Check console for script loading errors.");
            }

            const { initSDK, createInstance, SepoliaConfig } = sdk;

            console.log("🔐 Initializing FHE SDK...");
            await initSDK();

            // ✅ Use SepoliaConfig directly (no modifications needed)
            fheInstance = await createInstance(SepoliaConfig);

            console.log("✅ FHE instance initialized successfully");
            return fheInstance;
        } catch (err) {
            // Reset promise on failure to allow recovery
            initializationPromise = null;
            throw err;
        }
    })();

    return initializationPromise;
}

/**
 * Check if FHE is ready
 */
export async function isFHEReady(): Promise<boolean> {
    try {
        await getFHEInstance();
        return true; // Instance is ready if getFHEInstance() succeeds
    } catch (error) {
        console.error("FHE initialization failed:", error);
        return false;
    }
}

/**
 * Initialize FHE (alias for getFHEInstance for compatibility)
 */
export async function initializeFHE(): Promise<any> {
    return getFHEInstance();
}

/**
 * Create encrypted input for a contract
 */
export async function createEncryptedInput(
    contractAddress: string,
    userAddress: string
) {
    const instance = await getFHEInstance();
    return instance.createEncryptedInput(contractAddress, userAddress);
}

/**
 * Decrypt user data (requires EIP-712 signature)
 */
export async function userDecrypt(
    contractAddress: string,
    ciphertextHandle: bigint,
    signer: any
): Promise<bigint> {
    const instance = await getFHEInstance();
    return instance.userDecrypt(contractAddress, ciphertextHandle, signer);
}

/**
 * Decrypt public data (only after FHE.makePubliclyDecryptable in Solidity)
 */
export async function publicDecrypt(
    contractAddress: string,
    ciphertextHandle: bigint
): Promise<bigint> {
    const instance = await getFHEInstance();
    return instance.publicDecrypt(contractAddress, ciphertextHandle);
}
