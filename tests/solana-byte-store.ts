import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaByteStore } from "../target/types/solana_byte_store";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_SLOT_HASHES_PUBKEY,
  Transaction,
  sendAndConfirmTransaction, Keypair,
} from "@solana/web3.js";
import {expect} from "chai";
import crypto from 'crypto';
import BN from "bn.js";
import * as bs58 from 'bs58';

describe("solana-byte-store", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const connection = anchor.getProvider().connection;
  const program = anchor.workspace.SolanaByteStore as Program<SolanaByteStore>;

  const owner = anchor.web3.Keypair.generate();
  const id = generateRandomByteArray();

  before(async() => {
    await airdropToActors([owner.publicKey,]);

    // delay until (32 blocks 32 * ~400ms = 12.8s)
    await delay(30000);
  })

  it("it creates byte account", async () => {
    const bytes = generateRandomByteArray(100);

    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, owner);

    await createByteAccount(owner, id, bytes, Date.now() / 1000 + 86400);

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(bytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.eq(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(bytes)));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members(Array.from(bytes));

    await delay(1000);
  });

  it("it updates byte account to larger bytes", async () => {
    const bytes = generateRandomByteArray(200);

    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, owner);

    await updateByteAccount(owner, id, bytes, Date.now() / 1000 + 86400);

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(bytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(bytes)));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members(Array.from(bytes));

    await delay(1000);
  });

  it("it updates byte account to smaller bytes", async () => {
    const bytes = generateRandomByteArray(50);

    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, owner);

    await updateByteAccount(owner, id, bytes, Date.now() / 1000 + 86400);

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(bytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(bytes)));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members(Array.from(bytes));

    await delay(1000);
  });

  it("it deletes byte account", async () => {
    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, owner);

    await deleteByteAccount(owner, id);

    await program.account.byteAccount
            .fetch(byteAccountPDA)
            .then(() => expect(false).to.be.true)
            .catch(() => expect(true).to.be.true);

    await program.account.metadataAccount
            .fetch(metadataAccountPDA)
            .then(() => expect(false).to.be.true)
            .catch(() => expect(true).to.be.true);

    await delay(1000);
  });

  async function createByteAccount(
      owner: anchor.web3.Keypair,
      id: Uint8Array,
      bytes: Uint8Array,
      expiresAtTs?: number
  ) {
    const [byteAccountPDA] = getByteAccountPDA(id, owner);
    const [metadataAccountPDA] = getMetadataAccountPDA(id, owner);

    const transaction = new Transaction()
        .add(
            await program.methods
                .createByteAccount(
                    Array.from(id),
                    Buffer.from(bytes),
                    expiresAtTs ? new BN(expiresAtTs) : null
                )
                .accounts({
                  byteAccount: byteAccountPDA,
                  metadataAccount: metadataAccountPDA,
                  owner: owner.publicKey,
                  systemProgram: SystemProgram.programId
                })
                .transaction()
        )

    printTransaction(
        new Transaction()
            .add(
                await program.methods
                    .createByteAccount(
                        Array.from(id),
                        Buffer.from(bytes),
                        expiresAtTs ? new BN(expiresAtTs) : null
                    )
                    .accounts({
                      byteAccount: byteAccountPDA,
                      metadataAccount: metadataAccountPDA,
                      owner: owner.publicKey,
                      systemProgram: SystemProgram.programId
                    })
                    .transaction()
            ),
        "563MEMYqt2tQuaAM6aWwcfgsNdopaetuqABoEAiVnsAk",
        [owner]
    );

    await sendAndConfirmTransaction(connection, transaction, [owner]);
  }

  async function updateByteAccount(
      owner: anchor.web3.Keypair,
      id: Uint8Array,
      bytes: Uint8Array,
      expiresAtTs?: number
  ) {
    const [byteAccountPDA] = getByteAccountPDA(id, owner);
    const [metadataAccountPDA] = getMetadataAccountPDA(id, owner);

    const transaction = new Transaction()
        .add(
            await program.methods
                .updateByteAccount(
                    Buffer.from(bytes),
                    expiresAtTs ? new BN(expiresAtTs) : null
                )
                .accounts({
                  byteAccount: byteAccountPDA,
                  metadataAccount: metadataAccountPDA,
                  owner: owner.publicKey,
                  systemProgram: SystemProgram.programId
                })
                .transaction()
        )

    printTransaction(
        new Transaction()
            .add(
                await program.methods
                    .updateByteAccount(
                        Buffer.from(bytes),
                        expiresAtTs ? new BN(expiresAtTs) : null
                    )
                    .accounts({
                      byteAccount: byteAccountPDA,
                      metadataAccount: metadataAccountPDA,
                      owner: owner.publicKey,
                      systemProgram: SystemProgram.programId
                    })
                    .transaction()
            ),
        "563MEMYqt2tQuaAM6aWwcfgsNdopaetuqABoEAiVnsAk",
        [owner]
    );

    await sendAndConfirmTransaction(connection, transaction, [owner]);
  }

  async function deleteByteAccount(
      owner: anchor.web3.Keypair,
      id: Uint8Array
  ) {
    const [byteAccountPDA] = getByteAccountPDA(id, owner);
    const [metadataAccountPDA] = getMetadataAccountPDA(id, owner);

    const transaction = new Transaction()
        .add(
            await program.methods
                .deleteByteAccount()
                .accounts({
                  byteAccount: byteAccountPDA,
                  metadataAccount: metadataAccountPDA,
                  owner: owner.publicKey,
                })
                .transaction()
        )

    printTransaction(
        new Transaction()
            .add(
                await program.methods
                    .deleteByteAccount()
                    .accounts({
                      byteAccount: byteAccountPDA,
                      metadataAccount: metadataAccountPDA,
                      owner: owner.publicKey,
                    })
                    .transaction()
            ),
        "563MEMYqt2tQuaAM6aWwcfgsNdopaetuqABoEAiVnsAk",
        [owner]
    );

    await sendAndConfirmTransaction(connection, transaction, [owner]);
  }

  function getByteAccountPDA(
      id: Uint8Array,
      owner: anchor.web3.Keypair,
  ) {
    return PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode("byte_account"),
          owner.publicKey.toBytes(),
          Uint8Array.from(id)
        ],
        program.programId
    );
  }

  function getMetadataAccountPDA(
      id: Uint8Array,
      owner: anchor.web3.Keypair,
  ) {
    return PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode("metadata_account"),
          owner.publicKey.toBytes(),
          Uint8Array.from(id)
        ],
        program.programId
    );
  }

  function printTransaction(
      transaction: anchor.web3.Transaction,
      recentBlockhash: string,
      signers: anchor.web3.Signer[]
  ) {
    transaction.recentBlockhash = recentBlockhash;
    transaction.sign(...signers);
    console.log(bs58.encode(transaction.serialize()));
  }

  async function airdropToActors(actors: PublicKey[]) {
    for (const actor of actors) {
      await connection.confirmTransaction(
          await connection.requestAirdrop(
              actor,
              10 * LAMPORTS_PER_SOL,
          ),
          "confirmed"
      );
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function generateRandomByteArray(length: number = 32): Uint8Array {
    const byteArray = new Uint8Array(length);
    crypto.getRandomValues(byteArray);

    return byteArray;
  }

  async function generateChecksum(data: ArrayBuffer): Promise<Uint8Array> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    return new Uint8Array(hashBuffer);
  }
});
