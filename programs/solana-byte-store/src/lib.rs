use crate::instructions::*;

mod state;
mod error;
mod constant;
mod instructions;
mod util;

use anchor_lang::prelude::*;

declare_id!("EPHfyiTc9VqV9Cpoyb7HGfVjfAvxms58pARnuq233FhN");

#[program]
pub mod solana_byte_store {
    use super::*;

    pub fn create_byte_account(ctx: Context<CreateByteAccountContext>, id: [u8; 32], size: u64, bytes: Vec<u8>) -> Result<()> {
        create_byte_account::invoke(ctx, id, size, bytes)
    }

    pub fn update_byte_account(ctx: Context<UpdateByteAccountContext>) -> Result<()> {
        Ok(())
    }

    pub fn delete_byte_account(ctx: Context<DeleteByteAccountContext>) -> Result<()> {
        delete_byte_account::invoke(ctx)
    }
}
