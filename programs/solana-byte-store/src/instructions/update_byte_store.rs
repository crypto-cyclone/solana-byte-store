use anchor_lang::{prelude::*, solana_program::{system_program}};
use crate::state::ByteStoreAccount;

pub fn invoke(ctx: Context<UpdateByteStoreContext>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateByteStoreContext<'info> {
    #[account(
        mut,
        seeds=[b"byte_store_account", owner.key.as_ref(), byte_store_account.id.as_ref()],
        bump=byte_store_account.bump,
    )]
    pub byte_store_account: Account<'info, ByteStoreAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(address=system_program::ID)]
    pub system_program: Program<'info, System>,
}