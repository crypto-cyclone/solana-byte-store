import {Keypair, PublicKey, sendAndConfirmTransaction, Transaction} from "@solana/web3.js";
import {getProgramFromIDl} from "../util/get-program-from-idl";
import {getByteAccountPDA} from "../pda/byte-account";
import {getMetadataAccountPDA} from "../pda/metadata-account";
import {padBytesEnd} from "../util/pad-bytes";
import {getProvider} from "@coral-xyz/anchor";

export function prepareDeleteByteAccountOnArgument(): (argv: any, argValues: any) => void {
    return async () => {}
}

export function prepareDeleteByteAccountArguments(): any[] {
    return [{name: "id", type: {array: ["u8", 32]}}];
}

export function prepareDeleteByteAccountAccounts(
    args: Record<string, any>,
    owner: PublicKey
): Record<string, string> {
    const id = args['id'] as string;

    if (id == null) {
        throw new Error(`prepareDeleteEscrowAccounts argument id not found.`);
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

    const [byteAccountPDA] = getByteAccountPDA(
        owner,
        idBytes
    );

    const [metadataAccountPDA] = getMetadataAccountPDA(
        owner,
        idBytes
    );

    return {
        byteAccount: byteAccountPDA.toBase58(),
        metadataAccount: metadataAccountPDA.toBase58(),
        owner: owner.toBase58(),
    }
}

export async function deleteByteAccount(
    accounts: Record<string, string>,
    signers: [Keypair]
) {
    const program = getProgramFromIDl();

    const transaction = new Transaction()
        .add(
            await program.methods
                .deleteByteAccount()
                .accounts({
                    byteAccount: accounts['byteAccount'],
                    metadataAccount: accounts['metadataAccount'],
                    owner: accounts['owner'],
                })
                .transaction()
        );

    await sendAndConfirmTransaction(
        getProvider().connection,
        transaction,
        signers
    )
        .catch((err) => console.log(`failed to execute deleteByteAccount`, err))
        .then(() => console.log('executed deleteByteAccount'));
}