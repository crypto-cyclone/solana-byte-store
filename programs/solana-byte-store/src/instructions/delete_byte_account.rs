use anchor_lang::{prelude::*};
use crate::state::{ByteAccount, MetadataAccount};

pub fn invoke(ctx: Context<DeleteByteAccountContext>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct DeleteByteAccountContext<'info> {
    #[account(
        mut,
        seeds=[b"byte_account", owner.key.as_ref(), metadata_account.id.as_ref()],
        bump=byte_account.bump,
        close=owner
    )]
    pub byte_account: Account<'info, ByteAccount>,

    #[account(
        mut,
        seeds=[b"metadata_account", owner.key.as_ref(), metadata_account.id.as_ref()],
        bump=metadata_account.bump,
        close=owner
    )]
    pub metadata_account: Account<'info, MetadataAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,
}