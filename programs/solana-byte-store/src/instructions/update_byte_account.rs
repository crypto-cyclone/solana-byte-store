use anchor_lang::{prelude::*, solana_program::{system_program}};
use crate::error::SolanaByteStoreError;
use crate::state::{AESAccount, ByteAccount, MetadataAccount};
use crate::util::checksum;

pub fn invoke(
    ctx: Context<UpdateByteAccountContext>,
    bytes: Vec<u8>,
    aes_key: Option<Vec<u8>>,
    aes_iv: Option<Vec<u8>>,
    aes_auth_tag: Option<Vec<u8>>,
    expires_at_ts: Option<u64>
) -> Result<()> {
    let mut byte_account = &mut ctx.accounts.byte_account;
    let mut metadata_account = &mut ctx.accounts.metadata_account;
    let mut aes_account = &mut ctx.accounts.aes_account;

    let clock = Clock::get()?;
    let timestamp: u64 = clock.unix_timestamp.try_into().unwrap();

    require!(
        expires_at_ts.is_none() || expires_at_ts.unwrap().gt(&timestamp),
        SolanaByteStoreError::UpdateByteAccountInvalidExpiresAtTs
    );

    metadata_account.size = bytes.len() as u64;
    metadata_account.updated_at_ts = timestamp;
    metadata_account.checksum = checksum::generate(bytes.clone().as_slice());
    metadata_account.expires_at_ts = expires_at_ts.map_or(0, |v| v);

    aes_account.key = aes_key.map_or(vec![], |v| v);
    aes_account.iv = aes_iv.map_or(vec![], |v| v);
    aes_account.auth_tag = aes_auth_tag.map_or(vec![], |v| v);

    byte_account.bytes = bytes;

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
        seeds=[b"aes_account", owner.key.as_ref(), metadata_account.id.as_ref()],
        bump=aes_account.bump,
        realloc=8+std::mem::size_of::<AESAccount>()+aes_key.as_ref().map_or(0, |v| v.len())+aes_iv.as_ref().map_or(0, |v| v.len())+aes_auth_tag.as_ref().map_or(0, |v| v.len()),
        realloc::payer=owner,
        realloc::zero=false
    )]
    pub aes_account: Account<'info, AESAccount>,

    #[account(
        mut,
        seeds=[b"byte_account", owner.key.as_ref(), metadata_account.id.as_ref()],
        bump=byte_account.bump,
        realloc=8+std::mem::size_of::<ByteAccount>()+bytes.len(),
        realloc::payer=owner,
        realloc::zero=false
    )]
    pub byte_account: Account<'info, ByteAccount>,

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