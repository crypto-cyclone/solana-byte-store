import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaByteStore } from "../../target/types/solana_byte_store";

export function getProgramFromIDl(): Program<SolanaByteStore> {
    return anchor.workspace.SolanaByteStore as Program<SolanaByteStore>;
}