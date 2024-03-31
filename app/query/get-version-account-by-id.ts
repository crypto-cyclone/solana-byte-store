import {PublicKey} from "@solana/web3.js";
import {getProgramFromIDl} from "../util/get-program-from-idl";
import {padBytesEnd} from "../util/pad-bytes";
import {getVersionAccountPDA} from "../pda/version-account";

export async function getVersionAccountById(args: Record<string, any>) {
    const owner = args['owner'] as string;
    const id = args['id'] as string;

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

    await program.account.versionAccount.fetch(versionAccountPDA)
        .then((acc) => console.log(acc))
        .catch(() => console.log(null));
}