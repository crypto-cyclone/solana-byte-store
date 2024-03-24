use anchor_lang::prelude::*;

declare_id!("EPHfyiTc9VqV9Cpoyb7HGfVjfAvxms58pARnuq233FhN");

#[program]
pub mod solana_byte_store {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
