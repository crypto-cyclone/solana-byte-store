use anchor_lang::Accounts;
use anchor_lang::context::Context;
use anchor_lang::{prelude::*, solana_program::{system_program}};
use crate::instructions::delete_byte_store::DeleteByteStoreContext;
use crate::state::ByteStoreAccount;
use crate::error::SolanaByteStoreError;
use crate::util::checksum;

pub fn invoke(ctx: Context<CreateByteStoreContext>, id: [u8; 32], size: u32, bytes: Vec<u8>) -> Result<()> {
    let mut byte_store = &mut ctx.accounts.byte_store_account;

    let bytes_len: u32 = bytes.len() as u32;

    require!(
        bytes_len == size,
        SolanaByteStoreError::CreateByteStoreByteSizeMismatch
    );

    byte_store.id = id;
    byte_store.bump = ctx.bumps.byte_store_account;
    byte_store.size = size;
    byte_store.checksum = checksum::generate(&bytes.clone());
    byte_store.bytes = bytes;

    Ok(())
}

#[derive(Accounts)]
#[instruction(id: [u8; 32], size: usize)]
pub struct CreateByteStoreContext<'info> {
    #[account(
        init,
        payer=owner,
        space=125+size,
        seeds=[b"byte_store_account", owner.key.as_ref(), id.as_ref()],
        bump
    )]
    pub byte_store_account: Account<'info, ByteStoreAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(address=system_program::ID)]
    pub system_program: Program<'info, System>,
}