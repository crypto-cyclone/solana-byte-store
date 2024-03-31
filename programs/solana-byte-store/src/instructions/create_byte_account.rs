use anchor_lang::Accounts;
use anchor_lang::context::Context;
use anchor_lang::{prelude::*, solana_program::{system_program}};
use crate::state::{ByteAccount, MetadataAccount, VersionAccount};
use crate::error::SolanaByteStoreError;
use crate::util::checksum;

pub fn invoke(
    ctx: Context<CreateByteAccountContext>,
    id: [u8; 32],
    version: u64,
    bytes: Vec<u8>,
    aes_key: Option<Vec<u8>>,
    aes_iv: Option<Vec<u8>>,
    aes_auth_tag: Option<Vec<u8>>,
    expires_at_ts: Option<u64>,
) -> Result<()> {
    let owner = &ctx.accounts.owner;
    let version_account = &mut ctx.accounts.version_account;
    let byte_account = &mut ctx.accounts.byte_account;
    let metadata_account = &mut ctx.accounts.metadata_account;

    let clock = Clock::get()?;
    let timestamp: u64 = clock.unix_timestamp.try_into().unwrap();

    require!(
        expires_at_ts.is_none() || expires_at_ts.unwrap().gt(&timestamp),
        SolanaByteStoreError::CreateByteAccountInvalidExpiresAtTs
    );

    require!(
        version == version_account.current_version.saturating_add(1u64),
        SolanaByteStoreError::CreateByteAccountInvalidVersion
    );

    version_account.id = id;
    version_account.bump = ctx.bumps.version_account;
    version_account.owner = owner.key();
    version_account.current_version = version;

    metadata_account.id = id;
    metadata_account.bump = ctx.bumps.metadata_account;
    metadata_account.owner = owner.key();
    metadata_account.size = bytes.len() as u64;
    metadata_account.created_at_ts = timestamp;
    metadata_account.updated_at_ts = timestamp;
    metadata_account.version = version;
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
    id: [u8; 32],
    version: u64,
    bytes: Vec<u8>,
    aes_key: Option<Vec<u8>>,
    aes_iv: Option<Vec<u8>>,
    aes_auth_tag: Option<Vec<u8>>,
)]
pub struct CreateByteAccountContext<'info> {
    #[account(
        init_if_needed,
        payer=owner,
        space=8+std::mem::size_of::<VersionAccount>(),
        seeds=[b"version_account", owner.key.as_ref(), id.as_ref()],
        bump
    )]
    pub version_account: Account<'info, VersionAccount>,

    #[account(
        init,
        payer=owner,
        space=8+std::mem::size_of::<ByteAccount>()+bytes.len()+aes_key.as_ref().map_or(0, |v| v.len())+aes_iv.as_ref().map_or(0, |v| v.len())+aes_auth_tag.as_ref().map_or(0, |v| v.len()),
        seeds=[b"byte_account", owner.key.as_ref(), id.as_ref(), version.to_string().as_bytes().as_ref()],
        bump
    )]
    pub byte_account: Account<'info, ByteAccount>,

    #[account(
        init,
        payer=owner,
        space=512,
        seeds=[b"metadata_account", owner.key.as_ref(), id.as_ref(), version.to_string().as_bytes().as_ref()],
        bump
    )]
    pub metadata_account: Account<'info, MetadataAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(address=system_program::ID)]
    pub system_program: Program<'info, System>,
}