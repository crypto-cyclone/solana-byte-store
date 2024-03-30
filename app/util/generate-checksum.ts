import crypto from 'crypto';

export async function generateChecksum(data: ArrayBuffer): Promise<Uint8Array> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    return new Uint8Array(hashBuffer);
}