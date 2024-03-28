import * as anchor from "@coral-xyz/anchor";
import {PublicKey} from "@solana/web3.js";
import {getProgramFromIDl} from "../util/get-program-from-idl";

export function getMetadataAccountPDA(
    owner: anchor.web3.PublicKey,
    id: Uint8Array,
) {
    const program = getProgramFromIDl();

    return PublicKey.findProgramAddressSync(
        [
            anchor.utils.bytes.utf8.encode("metadata_account"),
            owner.toBytes(),
            id
        ],
        program.programId
    );
}