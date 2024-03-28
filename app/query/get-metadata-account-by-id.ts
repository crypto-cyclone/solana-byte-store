import {PublicKey} from "@solana/web3.js";
import {getProgramFromIDl} from "../util/get-program-from-idl";
import {getMetadataAccountPDA} from "../pda/metadata-account";

export async function getByteAccountById(args: Record<string, any>) {
    const owner = args['owner'];
    const id = args['id'];

    const [metadataAccountPDA] = getMetadataAccountPDA(
        Buffer.from(id, 'utf8'),
        new PublicKey(owner)
    );

    const program = getProgramFromIDl();

    const account = program.account.metadataAccount.fetch(metadataAccountPDA)
        .catch(() => null);

    return account;
}