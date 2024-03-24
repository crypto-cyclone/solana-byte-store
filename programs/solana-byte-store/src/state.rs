use anchor_lang::{prelude::*};

#[account]
pub struct ByteStoreAccount {
    pub id: [u8; 32],
    pub bump: u8,
    pub owner: Pubkey,
    pub create_at_ts: u64,
    pub updated_at_ts: u64,
    pub expires_at_ts: u64,
    pub size: u32,
    pub checksum: [u8; 32],
    pub bytes: Vec<u8>,
}