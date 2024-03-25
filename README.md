# Solana Byte Store

Solana Byte Store is a Solana program that enables the storage of arbitrary bytes in accounts on the Solana blockchain. This feature is particularly useful for applications that require remote configurations, secrets storage (client-side encryption advised), and other use cases where decentralized byte storage is needed.

## Features

- **Byte Account Creation**: Initialize accounts dedicated to storing arbitrary byte data.
- **Data Management**: Update existing byte storage with new data or delete it as needed.
- **Metadata Tracking**: Each byte storage account comes with associated metadata for management and tracking purposes, including size, creation and update timestamps, and checksum.

## Getting Started

### Prerequisites

- Solana CLI
- Rust installed (latest stable version recommended)
- Solana development environment set up

### Installation

1. Clone the repository:

    ```bash
    git clone git@github.com:crypto-cyclone/solana-byte-store.git
    ```

2. Navigate to the project directory:

    ```bash
    cd solana-byte-store
    ```

3. Build the program:

    ```bash
    cargo build-bpf
    ```

### Deployment

To deploy the Solana Byte Store program to a Solana cluster:

```bash
solana program deploy /target/deploy/solana_byte_store.so
```

## Usage
Ensure you have @coral-xyz/anchor, @solana/web3.js, and other necessary dependencies installed in your project to use these examples.

## Creating a Byte Account
To create a new byte account, you will need to generate a unique identifier for the account, the byte data you want to store, and an optional expiration timestamp.

```typescript
import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Program, BN, AnchorProvider } from '@coral-xyz/anchor';
import { SolanaByteStore } from '../target/types/solana_byte_store';

// Initialization
const provider = AnchorProvider.env();
const program = new Program<SolanaByteStore>(IDL, programId, provider);
const owner = Keypair.generate();
const id = generateRandomByteArray(); // A function to generate a unique identifier
const bytes = new Uint8Array([...]); // Your byte data here
const expiresAtTs = new BN(Date.now() / 1000 + 86400); // Expiration timestamp (optional)

// Derive the PDA for the byte account and metadata account
const [byteAccountPDA, byteAccountBump] = await PublicKey.findProgramAddress(
        [Buffer.from("byte_account"), owner.publicKey.toBuffer(), id],
        program.programId
);

const [metadataAccountPDA, metadataAccountBump] = await PublicKey.findProgramAddress(
        [Buffer.from("metadata_account"), owner.publicKey.toBuffer(), id],
        program.programId
);

// Create the transaction
const tx = new Transaction().add(
        program.instruction.createByteAccount(
                Array.from(id),
                Buffer.from(bytes),
                expiresAtTs,
                {
                   accounts: {
                      byteAccount: byteAccountPDA,
                      metadataAccount: metadataAccountPDA,
                      owner: owner.publicKey,
                      systemProgram: SystemProgram.programId,
                   },
                }
        )
);

// Send the transaction
const signature = await provider.sendAndConfirm(tx, [owner]);
console.log(`Transaction signature: ${signature}`);
```

## Updating a Byte Account
To update an existing byte account, provide the new byte data and an optional new expiration timestamp. This example demonstrates updating an account to store larger byte data.

```typescript
const newBytes = new Uint8Array([...]); // New byte data
const newExpiresAtTs = new BN(Date.now() / 1000 + 172800); // New expiration timestamp (optional)

// Create the transaction for updating the byte account
const txUpdate = new Transaction().add(
  program.instruction.updateByteAccount(
    Buffer.from(newBytes),
    newExpiresAtTs,
    {
      accounts: {
        byteAccount: byteAccountPDA,
        metadataAccount: metadataAccountPDA,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      },
    }
  )
);

// Send the transaction
const updateSignature = await provider.sendAndConfirm(txUpdate, [owner]);
console.log(`Update transaction signature: ${updateSignature}`);

```

## Deleting a Byte Account
To delete a byte account, simply call the deleteByteAccount function with the owner and the unique identifier of the account.

```typescript
// Create the transaction for deleting the byte account
const txDelete = new Transaction().add(
  program.instruction.deleteByteAccount({
    accounts: {
      byteAccount: byteAccountPDA,
      metadataAccount: metadataAccountPDA,
      owner: owner.publicKey,
    },
  })
);

// Send the transaction
const deleteSignature = await provider.sendAndConfirm(txDelete, [owner]);
console.log(`Delete transaction signature: ${deleteSignature}`);

```

## License
This project is licensed under the MIT License.