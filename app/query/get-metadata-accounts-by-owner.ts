import {getProgramFromIDl} from "../util/get-program-from-idl";

export async function getMetadataAccountsByOwner(args: Record<string, any>) {
    const owner = args['owner'];

    const program = getProgramFromIDl();

    await program.account.metadataAccount.all([
        {
            memcmp: {
                bytes: owner,
                offset: 8 + 33,
            },
        }
    ])
        .then((accs) => console.log(accs))
        .catch(() => console.log([]));

}