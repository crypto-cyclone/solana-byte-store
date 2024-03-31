use anchor_lang::{prelude::*};
use crate::state::{VersionAccount};

pub fn invoke(_ctx: Context<DeleteVersionAccountContext>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct DeleteVersionAccountContext<'info> {
    #[account(
        mut,
        seeds=[b"version_account", owner.key.as_ref(), version_account.id.as_ref()],
        bump=version_account.bump,
        close=owner
    )]
    pub version_account: Account<'info, VersionAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,
}