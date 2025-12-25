/**
 * FHE Context - Singleton pattern for FHE SDK initialization
 * Uses bundled @zama-fhe/relayer-sdk (npm package)
 * 
 * This module provides:
 * - FHE SDK initialization (initializeFHE)
 * - Singleton FHE instance (getFHEInstance)
 * - Encryption utilities (encryptBidAmount)
 * - Decryption utilities (publicDecrypt, userDecrypt)
 */

// ✅ MUST use explicit ESM entry - the package root is not exported
import {
    createInstance,
    initSDK,
    SepoliaConfig,
} from "@zama-fhe/relayer-sdk/dist/esm/index.js";

// Global singleton state
let fheInstance = null;
let isInitialized = false;
let initPromise = null;
let initError = null;

/**
 * Initialize the FHE SDK
 * Must be called before using any FHE functionality
 */
export async function initializeFHE() {
    if (typeof window === 'undefined') {
        throw new Error('FHE SDK can only be used in the browser');
    }

    // REQUIRED for browser environments - loads TFHE WASM
    await initSDK();
    console.log('✅ FHE SDK initialized (WASM loaded)');
}

/**
 * Get or create FHE instance (singleton pattern)
 * Uses Zama Sepolia Devnet config (chain 8009)
 * @returns {Promise<FhevmInstance>}
 */
export async function getFHEInstance() {
    // Return existing instance
    if (fheInstance && isInitialized) {
        return fheInstance;
    }

    // Return in-progress initialization
    if (initPromise) {
        return initPromise;
    }

    // Start new initialization
    initPromise = (async () => {
        try {
            initError = null;

            // Check ethereum provider
            if (typeof window === 'undefined' || !window.ethereum) {
                throw new Error('Ethereum provider not available. Please install MetaMask.');
            }

            // ✅ REQUIRED: Initialize SDK first (loads TFHE WASM)
            await initSDK();
            console.log('✅ FHE SDK initialized (WASM loaded)');

            // ✅ Create instance with Zama Sepolia Devnet config (chain 8009)
            console.log('📡 Creating FHE instance for chain 8009...');

            fheInstance = await createInstance({
                chainId: 8009, // Zama Sepolia Devnet
                ...SepoliaConfig,
                network: window.ethereum,
            });

            isInitialized = true;
            console.log('✅ FHEVM instance ready (chain 8009)');
            console.log('   isReady:', fheInstance.isReady?.() ?? 'method not available');

            return fheInstance;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to initialize FHE';
            initError = errorMessage;
            initPromise = null;
            console.error('❌ FHE initialization error:', err);
            throw err;
        }
    })();

    return initPromise;
}

/**
 * Check if FHE is ready
 * @returns {boolean}
 */
export function isFHEReady() {
    return isInitialized && fheInstance !== null && initError === null;
}

/**
 * Get initialization error if any
 * @returns {string|null}
 */
export function getFHEError() {
    return initError;
}

/**
 * Encrypt a bid amount (uint32) for the auction contract
 * @param {string} contractAddress - Auction contract address
 * @param {string} userAddress - User's wallet address
 * @param {number|bigint} amount - Bid amount to encrypt
 * @returns {Promise<{handle: Uint8Array, proof: Uint8Array}>}
 */
export async function encryptBidAmount(contractAddress, userAddress, amount) {
    // This will initialize FHE if not ready, or throw on failure
    const instance = await getFHEInstance();

    const input = instance.createEncryptedInput(contractAddress, userAddress);
    input.add32(Number(amount)); // euint32 for auction bids

    const encryptedInput = await input.encrypt();

    console.log('🔐 Bid encrypted successfully');
    console.log('   Handle (first 20 chars):', toHex(encryptedInput.handles[0]).substring(0, 20) + '...');

    return {
        handle: encryptedInput.handles[0],
        proof: encryptedInput.inputProof,
    };
}

/**
 * Public decrypt - anyone can call with the ciphertext handle
 * Used for revealing auction winner after auction ends
 * @param {string} ciphertext - Ciphertext handle (bytes32)
 * @returns {Promise<{value: bigint, proof: string}>}
 */
export async function publicDecrypt(ciphertext) {
    const instance = await getFHEInstance();

    const { clearValues, decryptionProof } = await instance.publicDecrypt([ciphertext]);

    const decryptedValue = clearValues[ciphertext];
    const value = typeof decryptedValue === 'bigint' ? decryptedValue : BigInt(decryptedValue);

    console.log('🔓 Public decryption successful');

    return {
        value,
        proof: decryptionProof,
    };
}

/**
 * User decrypt - requires user signature (EIP-712)
 * Used for viewing your own encrypted bid
 * @param {string} ciphertextHandle - Ciphertext handle
 * @param {string} contractAddress - Contract address
 * @param {Object} signer - Ethers signer
 * @returns {Promise<bigint>}
 */
export async function userDecrypt(ciphertextHandle, contractAddress, signer) {
    const instance = await getFHEInstance();

    const keypair = instance.generateKeypair();
    const handleContractPairs = [
        {
            handle: ciphertextHandle,
            contractAddress: contractAddress,
        },
    ];

    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = '10';
    const contractAddresses = [contractAddress];

    const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
    );

    const signature = await signer.signTypedData(
        eip712.domain,
        {
            UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message
    );

    const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        await signer.getAddress(),
        startTimeStamp,
        durationDays
    );

    const decryptedValue = result[ciphertextHandle];
    return typeof decryptedValue === 'bigint' ? decryptedValue : BigInt(decryptedValue);
}

/**
 * Convert Uint8Array to hex string
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function toHex(bytes) {
    if (typeof bytes === 'string') {
        return bytes.startsWith('0x') ? bytes : '0x' + bytes;
    }
    return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
