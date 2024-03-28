import {PublicKey} from "@solana/web3.js";
import {getByteAccountPDA} from "../pda/byte-account";
import {getProgramFromIDl} from "../util/get-program-from-idl";
import {padBytesEnd} from "../util/pad-bytes";

export async function getByteAccountById(args: Record<string, any>) {
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

    await program.account.byteAccount.fetch(byteAccountPDA)
        .then((acc) => console.log(acc))
        .catch(() => console.log(null));
}