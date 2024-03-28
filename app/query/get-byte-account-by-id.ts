import {PublicKey} from "@solana/web3.js";
import {getByteAccountPDA} from "../pda/byte-account";
import {getProgramFromIDl} from "../util/get-program-from-idl";

export async function getByteAccountById(args: Record<string, any>) {
    const owner = args['owner'];
    const id = args['id'];

    const [byteAccountPDA] = getByteAccountPDA(
        Buffer.from(id, 'utf8'),
        new PublicKey(owner)
    );

    const program = getProgramFromIDl();

    const account = program.account.byteAccount.fetch(byteAccountPDA)
        .catch(() => null);

    return account;
}