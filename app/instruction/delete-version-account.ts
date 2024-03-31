import {Keypair, PublicKey, sendAndConfirmTransaction, Transaction} from "@solana/web3.js";
import {getProgramFromIDl} from "../util/get-program-from-idl";
import {padBytesEnd} from "../util/pad-bytes";
import {getProvider} from "@coral-xyz/anchor";
import {getVersionAccountPDA} from "../pda/version-account";

export function prepareDeleteVersionAccountOnArgument(): (argv: any, argValues: any) => void {
    return async () => {}
}

export function prepareDeleteVersionAccountArguments(): any[] {
    return [{name: "id", type: {array: ["u8", 32]}}];
}

export function prepareDeleteVersionAccountAccounts(
    args: Record<string, any>,
    owner: PublicKey
): Record<string, string> {
    const id = args['id'] as string;

    if (id == null) {
        throw new Error(`prepareDeleteVersionAccount argument id not found.`);
    }

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
        owner,
        idBytes,
    );

    return {
        versionAccount: versionAccountPDA.toBase58(),
        owner: owner.toBase58(),
    }
}

export async function deleteVersionAccount(
    accounts: Record<string, string>,
    signers: [Keypair]
) {
    const program = getProgramFromIDl();

    const transaction = new Transaction()
        .add(
            await program.methods
                .deleteVersionAccount()
                .accounts({
                    versionAccount: accounts['versionAccount'],
                    owner: accounts['owner'],
                })
                .transaction()
        );

    await sendAndConfirmTransaction(
        getProvider().connection,
        transaction,
        signers
    )
        .catch((err) => console.log(`failed to execute deleteVersionAccount`, err))
        .then(() => console.log('executed deleteVersionAccount'));
}