import {Keypair, PublicKey, sendAndConfirmTransaction, Transaction} from "@solana/web3.js";
import {getProgramFromIDl} from "../util/get-program-from-idl";
import {getByteAccountPDA} from "../pda/byte-account";
import {getMetadataAccountPDA} from "../pda/metadata-account";
import * as anchor from "@coral-xyz/anchor";

export function prepareDeleteEscrowArguments(): any[] {
    return [{name: "id", type: {array: ["u8", 32]}}];
}

export function prepareDeleteEscrowAccounts(
    args: Record<string, any>,
    owner: PublicKey
): Record<string, string> {
    const id = args['id'] as string;

    if (id == null) {
        throw new Error(`prepareDeleteEscrowAccounts argument id not found.`);
    }

    const [byteAccountPDA] = getByteAccountPDA(
        Uint8Array.from(
            Buffer.from(id, 'utf8')
        ),
        owner
    );

    const [metadataAccountPDA] = getMetadataAccountPDA(
        Uint8Array.from(
            Buffer.from(id, 'base64')
        ),
        owner
    )

    return {
        byteAccount: byteAccountPDA.toBase58(),
        metadataAccount: metadataAccountPDA.toBase58(),
        owner: owner.toBase58(),
    }
}

export async function deleteEscrow(
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
        anchor.AnchorProvider.env().connection,
        transaction,
        signers
    );
}