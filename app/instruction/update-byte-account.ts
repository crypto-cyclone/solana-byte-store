import {Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction} from "@solana/web3.js";
import {getProgramFromIDl} from "../util/get-program-from-idl";
import BN from "bn.js";
import {getByteAccountPDA} from "../pda/byte-account";
import {getMetadataAccountPDA} from "../pda/metadata-account";
import * as anchor from "@coral-xyz/anchor";
import {padBytesEnd} from "../util/pad-bytes";

export function prepareUpdateByteAccountArguments(): any[] {
    return [{name: "id", type: {array: ["u8", 32]}}];
}

export function prepareUpdateByteAccountAccounts(
    args: Record<string, any>,
    owner: PublicKey
): Record<string, string> {
    const id = args['id'] as string;

    if (id == null) {
        throw new Error(`prepareUpdateEscrowAccounts argument id not found.`);
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
        systemProgram: SystemProgram.programId.toBase58()
    }
}

export async function updateByteAccount(
    args: Record<string, any>,
    accounts: Record<string, string>,
    signers: [Keypair]
) {
    const program = getProgramFromIDl();

    const transaction = new Transaction()
        .add(
            await program.methods
                .updateByteAccount(
                    Buffer.from(args['bytes'] as string, 'base64'),
                    args['expiresAtTs'] ? new BN(args['expiresAtTs'] as string) : null
                )
                .accounts({
                    byteAccount: accounts['byteAccount'],
                    metadataAccount: accounts['metadataAccount'],
                    owner: accounts['owner'],
                    systemProgram: accounts['systemProgram']
                })
                .transaction()
        );

    await sendAndConfirmTransaction(
        anchor.AnchorProvider.env().connection,
        transaction,
        signers
    )
        .catch((err) => console.log(`failed to execute updateByteAccount`, err))
        .then(() => console.log('executed updateByteAccount'));
}