import crypto from "crypto";

export function decryptBytesAES(key: Uint8Array, encryptedData: Uint8Array, iv: Uint8Array, authTag: Uint8Array) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData);

    return Uint8Array.from(Buffer.concat([decrypted, decipher.final()]));
}