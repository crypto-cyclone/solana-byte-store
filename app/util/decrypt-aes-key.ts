import {Keypair} from "@solana/web3.js";
import {deriveRSAKeyPair} from "./derive-rsa-keypair";
import * as forge from 'node-forge';

export function decryptAESKey(keypair: Keypair, encryptedAESKey: Uint8Array): Uint8Array {
    const rsaKeypair = deriveRSAKeyPair(keypair.secretKey);
    const decryptedBytes = rsaKeypair.privateKey.decrypt(encryptedAESKey);
    return forge.util.binary.raw.decode(decryptedBytes);
}