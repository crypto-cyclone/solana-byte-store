import {padBytesEnd} from "../util/pad-bytes";
import {getVersionAccountPDA} from "../pda/version-account";
import {Keypair, PublicKey} from "@solana/web3.js";
import {getProgramFromIDl} from "../util/get-program-from-idl";
import {getByteAccountPDA} from "../pda/byte-account";
import {decryptAESKey} from "../util/decrypt-aes-key";
import {decryptBytesAES} from "../util/decrypt-bytes-aes";

export async function getDecryptedBytesForNVersions(args: Record<string, any>, keypair: Keypair) {
    const owner = args['owner'] as string;
    const id = args['id'] as string;
    const limit = args['limit'] as number;

    const idBytes = padBytesEnd(
        Uint8Array.from(
            Buffer.from(id, 'utf8')
        ),
        32
    );

    if (idBytes.length > 32) {
        throw new Error('id could not fit within 32 bytes')
    }

    const [versionAccountPDA] = getVersionAccountPDA(
        new PublicKey(owner),
        idBytes,
    );

    const program = getProgramFromIDl();

    const versionAccount =
        await program.account.versionAccount.fetchNullable(versionAccountPDA);

    if (versionAccount == null) {
        console.log([]);
        return;
    }

    const nEnd = versionAccount.currentVersion.toNumber();
    const nStart = Math.max(nEnd - limit, 1);

    const byteAccounts: PublicKey[] = [];

    for (let i = nStart; i <= nEnd; i++) {
        byteAccounts.push(
            new PublicKey(
                getByteAccountPDA(
                    new PublicKey(owner),
                    idBytes,
                    i
                )[0]
            )
        )
    }

    await program.account.byteAccount
        .fetchMultiple(byteAccounts).catch(() => [])
        .then((accs) => accs.forEach((byteAccount) => {
            const encryptedBytes = Uint8Array.from(byteAccount.bytes);
            const encryptedAesKey = Uint8Array.from(byteAccount.aesKey);
            const aesIv = Uint8Array.from(byteAccount.aesIv);
            const aesAuthTag = Uint8Array.from(byteAccount.aesAuthTag);

            if (encryptedBytes.length < 1 || encryptedAesKey.length < 1 || aesIv.length < 1 || aesAuthTag.length < 1) {
                console.log("Insufficient parameters for decrypting bytes");
                return;
            }

            const aesKey = decryptAESKey(keypair, encryptedAesKey);
            const decryptedBytes = decryptBytesAES(aesKey, encryptedBytes, aesIv, aesAuthTag);

            console.log(Buffer.from(decryptedBytes).toString('utf8'));
        }))
        .catch(() => console.log([]));
}