import {PublicKey} from "@solana/web3.js";
import {getProgramFromIDl} from "../util/get-program-from-idl";

export async function getByteAccountsByOwner(args: Record<string, any>) {
    const owner = args['owner'];

    const program = getProgramFromIDl();

    const metadataAccounts = await program.account.metadataAccount.all([
        {
            memcmp: {
                bytes: owner,
                offset: 8 + 33,
            },
        }
    ])
        .catch(() => []);

    const byteAccounts: PublicKey[] = metadataAccounts.map((meta) => meta.account.byteAccount);

    await program.account.byteAccount
        .fetchMultiple(byteAccounts).catch(() => [])
        .then((accs) => console.log(accs))
        .catch(() => console.log([]));
}