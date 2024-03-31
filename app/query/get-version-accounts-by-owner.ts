import {getProgramFromIDl} from "../util/get-program-from-idl";

export async function getVersionAccountsByOwner(args: Record<string, any>) {
    const owner = args['owner'] as string;

    const program = getProgramFromIDl();

    await program.account.versionAccount.all([
        {
            memcmp: {
                bytes: owner,
                offset: 8 + 33,
            },
        }
    ])
        .then((accs) => console.log(accs.map((acc) => acc.account)))
        .catch(() => console.log([]));
}