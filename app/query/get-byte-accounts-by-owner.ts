import {PublicKey} from "@solana/web3.js";
import {getProgramFromIDl} from "../util/get-program-from-idl";
import {getMetadataAccountsByOwner} from "./get-metadata-accounts-by-owner";

export async function getByteAccountsByOwner(args: Record<string, any>) {
    const owner = args['owner'];

    const metadataAccounts = await getMetadataAccountsByOwner(owner);

    const byteAccounts: PublicKey[] = metadataAccounts.map((meta) => meta.account.byteAccount);

    const program = getProgramFromIDl();

    const accounts = await program.account.byteAccount
        .fetchMultiple(byteAccounts).catch(() => []);

    return accounts;
}