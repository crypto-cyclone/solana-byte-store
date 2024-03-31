import * as anchor from "@coral-xyz/anchor";
import {getProgramFromIDl} from "../util/get-program-from-idl";
import {PublicKey} from "@solana/web3.js";

export function getVersionAccountPDA(
    owner: anchor.web3.PublicKey,
    id: Uint8Array,
) {
    const program = getProgramFromIDl();

    return PublicKey.findProgramAddressSync(
        [
            anchor.utils.bytes.utf8.encode("version_account"),
            owner.toBytes(),
            id,
        ],
        program.programId
    );
}