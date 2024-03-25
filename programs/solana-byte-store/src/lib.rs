use crate::instructions::*;

mod state;
mod error;
mod constant;
mod instructions;
mod util;

use anchor_lang::prelude::*;

declare_id!("A8cSqMKMx6fN4WVGKmBAdRZ9QgkHHvNriDhUyecP63hs");

#[program]
pub mod solana_byte_store {
    use anchor_lang::__private::bytemuck::bytes_of;
    use super::*;

    pub fn create_byte_account(
        ctx: Context<CreateByteAccountContext>,
        id: [u8; 32],
        bytes: Vec<u8>,
        expires_at_ts: Option<u64>
    ) -> Result<()> {
        create_byte_account::invoke(ctx, id, bytes, expires_at_ts)
    }

    pub fn update_byte_account(ctx: Context<UpdateByteAccountContext>, bytes: Vec<u8>, expires_at_ts: Option<u64>) -> Result<()> {
        update_byte_account::invoke(ctx, bytes, expires_at_ts)
    }

    pub fn delete_byte_account(ctx: Context<DeleteByteAccountContext>) -> Result<()> {
        delete_byte_account::invoke(ctx)
    }
}
