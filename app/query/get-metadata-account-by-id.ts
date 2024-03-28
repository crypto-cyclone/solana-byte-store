import {PublicKey} from "@solana/web3.js";
import {getProgramFromIDl} from "../util/get-program-from-idl";
import {getMetadataAccountPDA} from "../pda/metadata-account";
import {padBytesEnd} from "../util/pad-bytes";

export async function getMetadataAccountById(args: Record<string, any>) {
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

    const [metadataAccountPDA] = getMetadataAccountPDA(
        new PublicKey(owner),
        idBytes
    );

    const program = getProgramFromIDl();

    await program.account.metadataAccount.fetch(metadataAccountPDA)
        .then((accs) => console.log(accs))
        .catch(() => console.log(null));
}