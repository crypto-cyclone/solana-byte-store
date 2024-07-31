use anchor_lang::{prelude::*, solana_program::{system_program}};
use crate::state::{ByteAccount, MetadataAccount};
use crate::util::checksum;

pub fn invoke(
    ctx: Context<AppendByteAccountContext>,
    bytes: Vec<u8>,
) -> Result<()> {
    let byte_account = &mut ctx.accounts.byte_account;
    let metadata_account = &mut ctx.accounts.metadata_account;

    let clock = Clock::get()?;
    let timestamp: u64 = clock.unix_timestamp.try_into().unwrap();

    byte_account.bump = ctx.bumps.byte_account;
    byte_account.bytes.append(&mut bytes.clone());

    metadata_account.size = byte_account.bytes.len() as u64;
    metadata_account.updated_at_ts = timestamp;
    metadata_account.checksum = checksum::generate(byte_account.bytes.clone().as_slice());
    metadata_account.byte_account = byte_account.to_account_info().key();

    Ok(())
}

#[derive(Accounts)]
#[instruction(bytes: Vec<u8>)]
pub struct AppendByteAccountContext<'info> {
    #[account(
        mut,
        seeds=[b"byte_account", owner.key.as_ref(), metadata_account.id.as_ref(), metadata_account.version.to_string().as_bytes().as_ref()],
        bump,
        realloc=8+std::mem::size_of::<ByteAccount>()+byte_account.bytes.len()+bytes.len()+byte_account.aes_key.len()+byte_account.aes_iv.len()+byte_account.aes_auth_tag.len(),
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