import {getProgramFromIDl} from "../util/get-program-from-idl";
import {PublicKey} from "@solana/web3.js";
import {padBytesEnd} from "../util/pad-bytes";
import {getVersionAccountPDA} from "../pda/version-account";
import {getByteAccountPDA} from "../pda/byte-account";

export async function getByteAccountsForNVersions(args: Record<string, any>) {
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
        .then((accs) => console.log(accs))
        .catch(() => console.log([]));
}