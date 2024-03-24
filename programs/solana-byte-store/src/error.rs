use anchor_lang::error_code;

#[error_code]
pub enum SolanaByteStoreError {
    /* create_byte_store */
    #[msg("length of bytes must be equal to size")]
    CreateByteStoreByteSizeMismatch

    /* update_byte_store */

    /* delete_byte_store */
}