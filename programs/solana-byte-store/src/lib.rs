use crate::instructions::*;

mod state;
mod error;
mod constant;
mod instructions;
mod util;

use anchor_lang::prelude::*;

declare_id!("byte88jyLaNSRzieGowSEjyMmazeuh1P6sREWE9tiTB");

#[program]
pub mod solana_byte_store {
    use super::*;

    pub fn create_byte_account(
        ctx: Context<CreateByteAccountContext>,
        id: [u8; 32],
        bytes: Vec<u8>,
        aes_key: Option<Vec<u8>>,
        aes_iv: Option<Vec<u8>>,
        aes_auth_tag: Option<Vec<u8>>,
        expires_at_ts: Option<u64>
    ) -> Result<()> {
        create_byte_account::invoke(
            ctx,
            id,
            bytes,
            aes_key,
            aes_iv,
            aes_auth_tag,
            expires_at_ts
        )
    }

    pub fn update_byte_account(
        ctx: Context<UpdateByteAccountContext>,
        bytes: Vec<u8>,
        aes_key: Option<Vec<u8>>,
        aes_iv: Option<Vec<u8>>,
        aes_auth_tag: Option<Vec<u8>>,
        expires_at_ts: Option<u64>
    ) -> Result<()> {
        update_byte_account::invoke(
            ctx,
            bytes,
            aes_key,
            aes_iv,
            aes_auth_tag,
            expires_at_ts
        )
    }

    pub fn delete_byte_account(ctx: Context<DeleteByteAccountContext>) -> Result<()> {
        delete_byte_account::invoke(ctx)
    }
}
