import {Keypair} from "@solana/web3.js";
import {deriveRSAKeyPair} from "./derive-rsa-keypair";
import * as forge from 'node-forge';

export function encryptAESKey(keypair: Keypair, aesKey: Uint8Array): Uint8Array {
    const rsaKeypair = deriveRSAKeyPair(keypair.secretKey);
    const aesKeyBuffer = forge.util.createBuffer(aesKey);
    const encryptedBytes = rsaKeypair.publicKey.encrypt(aesKeyBuffer.getBytes());
    return forge.util.binary.raw.decode(encryptedBytes);
}