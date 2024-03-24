use anchor_lang::{prelude::*, solana_program::{system_program}};
use crate::state::{ByteAccount, MetadataAccount};

pub fn invoke(ctx: Context<UpdateByteAccountContext>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateByteAccountContext<'info> {
    #[account(
        mut,
        seeds=[b"byte_account", owner.key.as_ref(), metadata_account.id.as_ref()],
        bump=byte_store_account.bump,
    )]
    pub byte_store_account: Account<'info, ByteAccount>,

    #[account(
        mut,
        seeds=[b"metadata_account", owner.key.as_ref(), metadata_account.id.as_ref()],
        bump=metadata_account.bump,
    )]
    pub metadata_account: Account<'info, MetadataAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(address=system_program::ID)]
    pub system_program: Program<'info, System>,
}