import * as forge from 'node-forge';

export function deriveRSAKeyPair(entropy: Uint8Array): forge.pki.rsa.KeyPair {
    const prng = forge.random.createInstance();
    prng.seedFileSync = function() {
        return forge.util.createBuffer(entropy).getBytes();
    };

    return forge.pki.rsa.generateKeyPair({ bits: 2048, prng: prng });
}