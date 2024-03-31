use anchor_lang::error_code;

#[error_code]
pub enum SolanaByteStoreError {
    /* create_byte_store */
    #[msg("expires_at_ts must be set in the future if set")]
    CreateByteAccountInvalidExpiresAtTs,
    #[msg("new version must be exactly 1 greater than the current version")]
    CreateByteAccountInvalidVersion,

    /* update_byte_store */
    #[msg("expires_at_ts must be set in the future if set")]
    UpdateByteAccountInvalidExpiresAtTs,
}