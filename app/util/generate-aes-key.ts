import crypto from "crypto";

export function generateAESKey(keySize = 32): Buffer {
    return crypto.randomBytes(keySize);
}