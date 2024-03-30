use anchor_lang::{prelude::*};

#[account]
pub struct ByteAccount {
    pub bump: u8,
    pub bytes: Vec<u8>,
    pub aes_key: Vec<u8>,
    pub aes_iv: Vec<u8>,
    pub aes_auth_tag: Vec<u8>,
}

#[account]
pub struct MetadataAccount {
    pub id: [u8; 32],
    pub bump: u8,
    pub owner: Pubkey,
    pub size: u64,
    pub checksum: [u8; 32],
    pub is_encrypted: bool,
    pub byte_account: Pubkey,
    pub created_at_ts: u64,
    pub updated_at_ts: u64,
    pub expires_at_ts: u64,
}