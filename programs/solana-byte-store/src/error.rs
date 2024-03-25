use anchor_lang::error_code;

#[error_code]
pub enum SolanaByteStoreError {
    #[msg("expires_at_ts must be set in the future if set")]
    CreateByteAccountInvalidExpiresAtTs,

    /* update_byte_store */
    #[msg("expires_at_ts must be set in the future if set")]
    UpdateByteAccountInvalidExpiresAtTs,
}