use anchor_lang::{prelude::*, solana_program::{system_program}};
use crate::error::SolanaByteStoreError;
use crate::state::{ByteAccount, MetadataAccount};
use crate::util::checksum;

pub fn invoke(
    ctx: Context<UpdateByteAccountContext>,
    bytes: Vec<u8>,
    aes_key: Option<Vec<u8>>,
    aes_iv: Option<Vec<u8>>,
    aes_auth_tag: Option<Vec<u8>>,
    expires_at_ts: Option<u64>
) -> Result<()> {
    let byte_account = &mut ctx.accounts.byte_account;
    let metadata_account = &mut ctx.accounts.metadata_account;

    let clock = Clock::get()?;
    let timestamp: u64 = clock.unix_timestamp.try_into().unwrap();

    require!(
        expires_at_ts.is_none() || expires_at_ts.unwrap().gt(&timestamp),
        SolanaByteStoreError::UpdateByteAccountInvalidExpiresAtTs
    );

    metadata_account.size = bytes.len() as u64;
    metadata_account.updated_at_ts = timestamp;
    metadata_account.checksum = checksum::generate(bytes.clone().as_slice());
    metadata_account.is_encrypted = aes_key.is_some();
    metadata_account.byte_account = byte_account.to_account_info().key();
    metadata_account.expires_at_ts = expires_at_ts.map_or(0, |v| v);

    byte_account.bump = ctx.bumps.byte_account;
    byte_account.bytes = bytes;
    byte_account.aes_key = aes_key.map_or(vec![], |v| v);
    byte_account.aes_iv = aes_iv.map_or(vec![], |v| v);
    byte_account.aes_auth_tag = aes_auth_tag.map_or(vec![], |v| v);

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    bytes: Vec<u8>,
    aes_key: Option<Vec<u8>>,
    aes_iv: Option<Vec<u8>>,
    aes_auth_tag: Option<Vec<u8>>,
)]
pub struct UpdateByteAccountContext<'info> {
    #[account(
        mut,
        seeds=[b"byte_account", owner.key.as_ref(), metadata_account.id.as_ref(), metadata_account.version.to_string().as_bytes().as_ref()],
        bump,
        realloc=8+std::mem::size_of::<ByteAccount>()+bytes.len()+aes_key.as_ref().map_or(0, |v| v.len())+aes_iv.as_ref().map_or(0, |v| v.len())+aes_auth_tag.as_ref().map_or(0, |v| v.len()),
        realloc::payer=owner,
        realloc::zero=true
    )]
    pub byte_account: Account<'info, ByteAccount>,

    #[account(
        mut,
        seeds=[b"metadata_account", owner.key.as_ref(), metadata_account.id.as_ref(), metadata_account.version.to_string().as_bytes().as_ref()],
        bump=metadata_account.bump,
    )]
    pub metadata_account: Account<'info, MetadataAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(address=system_program::ID)]
    pub system_program: Program<'info, System>,
}