import * as anchor from "@coral-xyz/anchor";
import {Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction} from "@solana/web3.js";
import {getProgramFromIDl} from "../util/get_program_f_idl";
import BN from "bn.js";
import {getByteAccountPDA} from "../pda/byte-account";
import {getMetadataAccountPDA} from "../pda/metadata-account";

export function prepareCreateEscrowArguments(): string[] {
    return [];
}

export function prepareCreateEscrowAccounts(
    args: Record<string, any>,
    owner: PublicKey
): Record<string, string> {
    const id = args['id'] as string;

    if (id == null) {
        throw new Error(`prepareCreateEscrowAccounts argument id not found.`);
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
        systemProgram: SystemProgram.programId.toBase58()
    }
}

export async function createEscrow(
    args: Record<string, any>,
    accounts: Record<string, string>,
    owner: Keypair
) {
    const program = getProgramFromIDl();

    const transaction = new Transaction()
        .add(
            await program.methods
                .createByteAccount(
                    Array.from(
                        Buffer.from(args['id'] as string, 'utf8')
                    ),
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
        [owner]
    );
}