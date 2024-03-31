import * as anchor from "@coral-xyz/anchor";
import {PublicKey} from "@solana/web3.js";
import {getProgramFromIDl} from "../util/get-program-from-idl";

export function getByteAccountPDA(
    owner: anchor.web3.PublicKey,
    id: Uint8Array,
    version: number,
) {
    const program = getProgramFromIDl();

    return PublicKey.findProgramAddressSync(
        [
            anchor.utils.bytes.utf8.encode("byte_account"),
            owner.toBytes(),
            id,
            anchor.utils.bytes.utf8.encode(`${version}`),
        ],
        program.programId
    );
}