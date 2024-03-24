use anchor_lang::Accounts;
use anchor_lang::context::Context;
use anchor_lang::{prelude::*, solana_program::{system_program}};
use crate::instructions::delete_byte_account::DeleteByteAccountContext;
use crate::state::{ByteAccount, MetadataAccount};
use crate::error::SolanaByteStoreError;
use crate::util::checksum;

pub fn invoke(ctx: Context<CreateByteAccountContext>, id: [u8; 32], size: u64, bytes: Vec<u8>) -> Result<()> {
    let owner = &ctx.accounts.owner;
    let mut byte_account = &mut ctx.accounts.byte_account;
    let mut metadata_account = &mut ctx.accounts.metadata_account;

    require!(
        bytes.len() == size as usize,
        SolanaByteStoreError::CreateByteStoreByteSizeMismatch
    );

    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp.try_into().unwrap();

    let cloned_bytes = bytes.clone();

    metadata_account.id = id;
    metadata_account.bump = ctx.bumps.metadata_account;
    metadata_account.owner = owner.key();
    metadata_account.size = size;
    metadata_account.created_at_ts = timestamp;
    metadata_account.updated_at_ts = timestamp;
    metadata_account.checksum = checksum::generate(cloned_bytes.as_slice());

    byte_account.bump = ctx.bumps.byte_account;
    byte_account.bytes = bytes;

    // TODO: expiry

    Ok(())
}

#[derive(Accounts)]
#[instruction(id: [u8; 32], size: u64)]
pub struct CreateByteAccountContext<'info> {
    #[account(
        init,
        payer=owner,
        space=13+(size as usize),
        seeds=[b"byte_account", owner.key.as_ref(), id.as_ref()],
        bump
    )]
    pub byte_account: Account<'info, ByteAccount>,

    #[account(
        init,
        payer=owner,
        space=512,
        seeds=[b"metadata_account", owner.key.as_ref(), id.as_ref()],
        bump
    )]
    pub metadata_account: Account<'info, MetadataAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(address=system_program::ID)]
    pub system_program: Program<'info, System>,
}