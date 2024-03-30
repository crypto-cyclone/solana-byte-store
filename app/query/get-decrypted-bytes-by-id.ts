import {padBytesEnd} from "../util/pad-bytes";
import {getByteAccountPDA} from "../pda/byte-account";
import {Keypair, PublicKey} from "@solana/web3.js";
import {getProgramFromIDl} from "../util/get-program-from-idl";
import {decryptAESKey} from "../util/decrypt-aes-key";
import {decryptBytesAES} from "../util/decrypt-bytes-aes";

export async function getDecryptedBytesById(args: Record<string, any>, keypair: Keypair) {
    const owner = args['owner'];
    const id = args['id'];

    const idBytes = padBytesEnd(
        Uint8Array.from(
            Buffer.from(id, 'utf8')
        ),
        32
    );

    if (idBytes.length > 32) {
        throw new Error('id could not fit within 32 bytes')
    }

    const [byteAccountPDA] = getByteAccountPDA(
        new PublicKey(owner),
        idBytes
    );

    const program = getProgramFromIDl();

    const byteAccount = await program.account.byteAccount.fetchNullable(byteAccountPDA);

    if (byteAccount == null) {
        console.log("ByteAccount was not found");
        return;
    }

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
}