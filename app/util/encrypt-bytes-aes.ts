import crypto from "crypto";

export function encryptBytesAES(key: Uint8Array, data: Uint8Array) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    const authTag = cipher.getAuthTag();

    return [
        new Uint8Array(encrypted),
        new Uint8Array(iv),
        new Uint8Array(authTag)
    ];
}