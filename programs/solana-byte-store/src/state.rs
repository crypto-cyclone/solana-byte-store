use anchor_lang::{prelude::*};

#[account]
pub struct ByteAccount {
    pub bump: u8,
    pub bytes: Vec<u8>
}

#[account]
pub struct MetadataAccount {
    pub id: [u8; 32],
    pub bump: u8,
    pub owner: Pubkey,
    pub size: u64,
    pub checksum: [u8; 32],
    pub byte_account: Pubkey,
    pub created_at_ts: u64,
    pub updated_at_ts: u64,
    pub expires_at_ts: u64,
}