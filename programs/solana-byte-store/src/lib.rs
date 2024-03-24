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

    pub fn create_byte_store(ctx: Context<CreateByteStoreContext>, id: [u8; 32], size: u32, bytes: Vec<u8>) -> Result<()> {
        create_byte_store::invoke(ctx, id, size, bytes)
    }

    pub fn update_byte_store(ctx: Context<UpdateByteStoreContext>) -> Result<()> {
        Ok(())
    }

    pub fn delete_byte_store(ctx: Context<DeleteByteStoreContext>) -> Result<()> {
        delete_byte_store::invoke(ctx)
    }
}
