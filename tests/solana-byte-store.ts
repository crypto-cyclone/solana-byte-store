import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaByteStore } from "../target/types/solana_byte_store";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction, Keypair,
} from "@solana/web3.js";
import {expect} from "chai";
import BN from "bn.js";
import * as bs58 from 'bs58';
import * as forge from 'node-forge';
const crypto = require('crypto');

describe("solana-byte-store", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const connection = anchor.getProvider().connection;
  const program = anchor.workspace.SolanaByteStore as Program<SolanaByteStore>;

  const owner = anchor.web3.Keypair.generate();
  const id1 = generateRandomByteArray();
  const id2 = generateRandomByteArray();

  before(async() => {
    await airdropToActors([owner.publicKey,]);

    // delay until (32 blocks 32 * ~400ms = 12.8s)
    await delay(30000);
  })

  it("it creates byte account version 1", async () => {
    const id = id1;
    const version = 1;
    const bytes = generateRandomByteArray(100);

    const [versionAccountPDA, versionAccountBump] = getVersionAccountPDA(id, owner);
    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    await createByteAccount(
        owner,
        id,
        version,
        bytes,
        null,
        null,
        null,
        Date.now() / 1000 + 86400
    );

    const versionAccountUpdate =
        await program.account.versionAccount.fetch(versionAccountPDA);

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    expect(versionAccountUpdate.bump).to.be.eq(versionAccountBump);
    expect(versionAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(Array.from(versionAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(versionAccountUpdate.currentVersion.toNumber()).to.be.eq(version);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(metadataAccountUpdate.version.toNumber()).to.be.eq(version);
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(bytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.eq(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(bytes)));
    expect(metadataAccountUpdate.isEncrypted).to.be.false;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members(Array.from(bytes));
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from([]));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from([]));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from([]));

    await delay(1000);
  });

  it("it appends more bytes to byte account version 1", async () => {
    const id = id1;
    const version = 1;
    const bytes = generateRandomByteArray(100);

    const [versionAccountPDA, versionAccountBump] = getVersionAccountPDA(id, owner);
    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    const byteAccount = await program.account.byteAccount.fetch(byteAccountPDA);

    await appendByteAccount(
        owner,
        id,
        version,
        bytes,
    );

    const versionAccountUpdate =
        await program.account.versionAccount.fetch(versionAccountPDA);

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    const totalBytes = [...Array.from(byteAccount.bytes), ...Array.from(bytes)];

    expect(versionAccountUpdate.bump).to.be.eq(versionAccountBump);
    expect(versionAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(Array.from(versionAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(versionAccountUpdate.currentVersion.toNumber()).to.be.eq(version);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(metadataAccountUpdate.version.toNumber()).to.be.eq(version);
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(totalBytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());

    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(Buffer.from(totalBytes))));
    expect(metadataAccountUpdate.isEncrypted).to.be.false;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members([
        ...Array.from(byteAccount.bytes),
        ...Array.from(bytes),
    ]);
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from(byteAccount.aesKey));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from(byteAccount.aesIv));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from(byteAccount.aesAuthTag));

    await delay(1000);
  });

  it("it updates byte account version 1 to larger bytes", async () => {
    const id = id1;
    const version = 1;
    const bytes = generateRandomByteArray(200);

    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    await updateByteAccount(
        owner,
        id,
        version,
        bytes,
        null,
        null,
        null,
        Date.now() / 1000 + 86400
    );

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
    expect(metadataAccountUpdate.isEncrypted).to.be.false;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members(Array.from(bytes));
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from([]));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from([]));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from([]));

    await delay(1000);
  });

  it("it updates byte account version 1 to smaller bytes", async () => {
    const id = id1;
    const version = 1;
    const bytes = generateRandomByteArray(50);

    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    await updateByteAccount(
        owner,
        id,
        version,
        bytes,
        null,
        null,
        null,
        Date.now() / 1000 + 86400
    );

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
    expect(metadataAccountUpdate.isEncrypted).to.be.false;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members(Array.from(bytes));
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from([]));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from([]));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from([]));

    await delay(1000);
  });

  it ("it creates byte account version 2", async () => {
    const id = id1;
    const version = 2;
    const bytes = generateRandomByteArray(100);

    const [versionAccountPDA, versionAccountBump] = getVersionAccountPDA(id, owner);
    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    await createByteAccount(
        owner,
        id,
        version,
        bytes,
        null,
        null,
        null,
        Date.now() / 1000 + 86400
    );

    const versionAccountUpdate =
        await program.account.versionAccount.fetch(versionAccountPDA);

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    expect(versionAccountUpdate.bump).to.be.eq(versionAccountBump);
    expect(versionAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(Array.from(versionAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(versionAccountUpdate.currentVersion.toNumber()).to.be.eq(version);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(metadataAccountUpdate.version.toNumber()).to.be.eq(version);
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(bytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.eq(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(bytes)));
    expect(metadataAccountUpdate.isEncrypted).to.be.false;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members(Array.from(bytes));
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from([]));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from([]));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from([]));

    await delay(1000);
  });

  it ("it appends more bytes to byte account version 2", async () => {
    const id = id1;
    const version = 2;
    const bytes = generateRandomByteArray(100);

    const [versionAccountPDA, versionAccountBump] = getVersionAccountPDA(id, owner);
    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    const byteAccount = await program.account.byteAccount.fetch(byteAccountPDA);

    await appendByteAccount(
        owner,
        id,
        version,
        bytes,
    );

    const versionAccountUpdate =
        await program.account.versionAccount.fetch(versionAccountPDA);

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    const totalBytes = [...Array.from(byteAccount.bytes), ...Array.from(bytes)];

    expect(versionAccountUpdate.bump).to.be.eq(versionAccountBump);
    expect(versionAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(Array.from(versionAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(versionAccountUpdate.currentVersion.toNumber()).to.be.eq(version);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(metadataAccountUpdate.version.toNumber()).to.be.eq(version);
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(totalBytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(Buffer.from(totalBytes))));
    expect(metadataAccountUpdate.isEncrypted).to.be.false;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members([
      ...Array.from(byteAccount.bytes),
      ...Array.from(bytes),
    ]);
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from(byteAccount.aesKey));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from(byteAccount.aesIv));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from(byteAccount.aesAuthTag));

    await delay(1000);
  });

  it("it updates byte account version 2 to larger bytes", async () => {
    const id = id1;
    const version = 2;
    const bytes = generateRandomByteArray(200);

    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    await updateByteAccount(
        owner,
        id,
        version,
        bytes,
        null,
        null,
        null,
        Date.now() / 1000 + 86400
    );

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(metadataAccountUpdate.version.toNumber()).to.be.eq(version);
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(bytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(bytes)));
    expect(metadataAccountUpdate.isEncrypted).to.be.false;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members(Array.from(bytes));
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from([]));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from([]));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from([]));

    await delay(1000);
  });

  it("it updates byte account version 2 to smaller bytes", async () => {
    const id = id1;
    const version = 2;
    const bytes = generateRandomByteArray(50);

    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    await updateByteAccount(
        owner,
        id,
        version,
        bytes,
        null,
        null,
        null,
        Date.now() / 1000 + 86400
    );

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(metadataAccountUpdate.version.toNumber()).to.be.eq(version);
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(bytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(bytes)));
    expect(metadataAccountUpdate.isEncrypted).to.be.false;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members(Array.from(bytes));
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from([]));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from([]));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from([]));

    await delay(1000);
  });

  it("it deletes byte account version 1", async () => {
    const id = id1;
    const version = 1;

    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    await deleteByteAccount(owner, version, id);

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

  it("it deletes byte account version 2", async () => {
    const id = id1;
    const version = 2;

    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    await deleteByteAccount(owner, version, id);

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

  it("it deletes version account", async () => {
    const id = id1;

    const [versionAccountPDA] = getVersionAccountPDA(id, owner);

    await deleteVersionAccount(owner, id);

    await program.account.versionAccount
        .fetch(versionAccountPDA)
        .then(() => expect(false).to.be.true)
        .catch(() => expect(true).to.be.true);

    await delay(1000);
  });

  it("it creates encrypted byte account version 1", async () => {
    const id = id1;
    const version = 1;
    const bytes = generateRandomByteArray(100);

    const [versionAccountPDA, versionAccountBump] = getVersionAccountPDA(id, owner);
    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    const aesKey = generateAESKey();
    const [encryptedBytes, aesIv, aesAuthTag] = encryptWithAESGCM(aesKey, bytes);
    const encryptedAesKey = encryptAESKey(owner, aesKey);

    await createByteAccount(
        owner,
        id,
        version,
        encryptedBytes,
        encryptedAesKey,
        aesIv,
        aesAuthTag,
        Date.now() / 1000 + 86400
    );

    const versionAccountUpdate =
        await program.account.versionAccount.fetch(versionAccountPDA);

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    expect(versionAccountUpdate.bump).to.be.eq(versionAccountBump);
    expect(versionAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(Array.from(versionAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(versionAccountUpdate.currentVersion.toNumber()).to.be.eq(version);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(metadataAccountUpdate.version.toNumber()).to.be.eq(version);
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(bytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.eq(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(encryptedBytes)));
    expect(metadataAccountUpdate.isEncrypted).to.be.true;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members(Array.from(encryptedBytes));
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from(encryptedAesKey));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from(aesIv));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from(aesAuthTag));

    const decryptedAesKey = decryptAESKey(owner, byteAccountUpdate.aesKey);
    const decryptedBytes = decryptWithAESGCM(
        decryptedAesKey,
        byteAccountUpdate.bytes,
        byteAccountUpdate.aesIv,
        byteAccountUpdate.aesAuthTag,
    );

    expect(Array.from(decryptedAesKey)).to.have.same.members(Array.from(aesKey));
    expect(Array.from(decryptedBytes)).to.have.same.members(Array.from(bytes));

    await delay(1000);
  });

  it("it appends more bytes to encrypted byte account version 1", async () => {
    const id = id1;
    const version = 1;
    const bytes = generateRandomByteArray(100);

    const [versionAccountPDA, versionAccountBump] = getVersionAccountPDA(id, owner);
    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    const aesKey = generateAESKey();
    const [encryptedBytes, aesIv, aesAuthTag] = encryptWithAESGCM(aesKey, bytes);
    const encryptedAesKey = encryptAESKey(owner, aesKey);

    const byteAccount = await program.account.byteAccount.fetch(byteAccountPDA);

    await appendByteAccount(
        owner,
        id,
        version,
        encryptedBytes,
    );

    const versionAccountUpdate =
        await program.account.versionAccount.fetch(versionAccountPDA);

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    const totalBytes = [...Array.from(byteAccount.bytes), ...Array.from(encryptedBytes)];

    expect(versionAccountUpdate.bump).to.be.eq(versionAccountBump);
    expect(versionAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(Array.from(versionAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(versionAccountUpdate.currentVersion.toNumber()).to.be.eq(version);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(metadataAccountUpdate.version.toNumber()).to.be.eq(version);
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(totalBytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(Buffer.from(totalBytes))));
    expect(metadataAccountUpdate.isEncrypted).to.be.true;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members([
      ...Array.from(byteAccount.bytes),
      ...Array.from(encryptedBytes),
    ]);
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from(byteAccount.aesKey));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from(byteAccount.aesIv));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from(byteAccount.aesAuthTag));

    await delay(1000);
  });

  it("it updates encrypted byte account version 1 to larger bytes", async () => {
    const id = id1;
    const version = 1;
    const bytes = generateRandomByteArray(200);

    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    const aesKey = generateAESKey();
    const [encryptedBytes, aesIv, aesAuthTag] = encryptWithAESGCM(aesKey, bytes);
    const encryptedAesKey = encryptAESKey(owner, aesKey);

    await updateByteAccount(
        owner,
        id,
        version,
        encryptedBytes,
        encryptedAesKey,
        aesIv,
        aesAuthTag,
        Date.now() / 1000 + 86400
    );

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(metadataAccountUpdate.version.toNumber()).to.be.eq(version);
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(bytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(encryptedBytes)));
    expect(metadataAccountUpdate.isEncrypted).to.be.true;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members(Array.from(encryptedBytes));
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from(encryptedAesKey));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from(aesIv));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from(aesAuthTag));

    const decryptedAesKey = decryptAESKey(owner, byteAccountUpdate.aesKey);
    const decryptedBytes = decryptWithAESGCM(
        decryptedAesKey,
        byteAccountUpdate.bytes,
        byteAccountUpdate.aesIv,
        byteAccountUpdate.aesAuthTag,
    );

    expect(Array.from(decryptedAesKey)).to.have.same.members(Array.from(aesKey));
    expect(Array.from(decryptedBytes)).to.have.same.members(Array.from(bytes));

    await delay(1000);
  });

  it("it updates encrypted byte account version 1 to smaller bytes", async () => {
    const id = id1;
    const version = 1;
    const bytes = generateRandomByteArray(50);

    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    const aesKey = generateAESKey();
    const [encryptedBytes, aesIv, aesAuthTag] = encryptWithAESGCM(aesKey, bytes);
    const encryptedAesKey = encryptAESKey(owner, aesKey);

    await updateByteAccount(
        owner,
        id,
        version,
        encryptedBytes,
        encryptedAesKey,
        aesIv,
        aesAuthTag,
        Date.now() / 1000 + 86400
    );

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(metadataAccountUpdate.version.toNumber()).to.be.eq(version);
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(bytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(encryptedBytes)));
    expect(metadataAccountUpdate.isEncrypted).to.be.true;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members(Array.from(encryptedBytes));
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from(encryptedAesKey));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from(aesIv));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from(aesAuthTag));

    const decryptedAesKey = decryptAESKey(owner, byteAccountUpdate.aesKey);
    const decryptedBytes = decryptWithAESGCM(
        decryptedAesKey,
        byteAccountUpdate.bytes,
        byteAccountUpdate.aesIv,
        byteAccountUpdate.aesAuthTag,
    );

    expect(Array.from(decryptedAesKey)).to.have.same.members(Array.from(aesKey));
    expect(Array.from(decryptedBytes)).to.have.same.members(Array.from(bytes));

    await delay(1000);
  });

  it ("it creates encrypted byte account version 2", async () => {
    const id = id1;
    const version = 2;
    const bytes = generateRandomByteArray(100);

    const [versionAccountPDA, versionAccountBump] = getVersionAccountPDA(id, owner);
    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    const aesKey = generateAESKey();
    const [encryptedBytes, aesIv, aesAuthTag] = encryptWithAESGCM(aesKey, bytes);
    const encryptedAesKey = encryptAESKey(owner, aesKey);

    await createByteAccount(
        owner,
        id,
        version,
        encryptedBytes,
        encryptedAesKey,
        aesIv,
        aesAuthTag,
        Date.now() / 1000 + 86400
    );

    const versionAccountUpdate =
        await program.account.versionAccount.fetch(versionAccountPDA);

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    expect(versionAccountUpdate.bump).to.be.eq(versionAccountBump);
    expect(versionAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(Array.from(versionAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(versionAccountUpdate.currentVersion.toNumber()).to.be.eq(version);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(metadataAccountUpdate.version.toNumber()).to.be.eq(version);
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(bytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.eq(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(encryptedBytes)));
    expect(metadataAccountUpdate.isEncrypted).to.be.true;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members(Array.from(encryptedBytes));
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from(encryptedAesKey));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from(aesIv));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from(aesAuthTag));

    const decryptedAesKey = decryptAESKey(owner, byteAccountUpdate.aesKey);
    const decryptedBytes = decryptWithAESGCM(
        decryptedAesKey,
        byteAccountUpdate.bytes,
        byteAccountUpdate.aesIv,
        byteAccountUpdate.aesAuthTag,
    );

    expect(Array.from(decryptedAesKey)).to.have.same.members(Array.from(aesKey));
    expect(Array.from(decryptedBytes)).to.have.same.members(Array.from(bytes));

    await delay(1000);
  });

  it ("it appends more bytes to encrypted byte account version 2", async () => {
    const id = id1;
    const version = 2;
    const bytes = generateRandomByteArray(100);

    const [versionAccountPDA, versionAccountBump] = getVersionAccountPDA(id, owner);
    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    const aesKey = generateAESKey();
    const [encryptedBytes, aesIv, aesAuthTag] = encryptWithAESGCM(aesKey, bytes);
    const encryptedAesKey = encryptAESKey(owner, aesKey);

    const byteAccount = await program.account.byteAccount.fetch(byteAccountPDA);

    await appendByteAccount(
        owner,
        id,
        version,
        encryptedBytes,
    );

    const versionAccountUpdate =
        await program.account.versionAccount.fetch(versionAccountPDA);

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    const totalBytes = [...Array.from(byteAccount.bytes), ...Array.from(encryptedBytes)];

    expect(versionAccountUpdate.bump).to.be.eq(versionAccountBump);
    expect(versionAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(Array.from(versionAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(versionAccountUpdate.currentVersion.toNumber()).to.be.eq(version);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(metadataAccountUpdate.version.toNumber()).to.be.eq(version);
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(totalBytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(Buffer.from(totalBytes))));
    expect(metadataAccountUpdate.isEncrypted).to.be.true;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members([
      ...Array.from(byteAccount.bytes),
      ...Array.from(encryptedBytes),
    ]);
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from(byteAccount.aesKey));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from(byteAccount.aesIv));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from(byteAccount.aesAuthTag));

    await delay(1000);
  });

  it("it updates encrypted byte account version 2 to larger bytes", async () => {
    const id = id1;
    const version = 2;
    const bytes = generateRandomByteArray(200);

    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    const aesKey = generateAESKey();
    const [encryptedBytes, aesIv, aesAuthTag] = encryptWithAESGCM(aesKey, bytes);
    const encryptedAesKey = encryptAESKey(owner, aesKey);

    await updateByteAccount(
        owner,
        id,
        version,
        encryptedBytes,
        encryptedAesKey,
        aesIv,
        aesAuthTag,
        Date.now() / 1000 + 86400
    );

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(metadataAccountUpdate.version.toNumber()).to.be.eq(version);
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(bytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(encryptedBytes)));
    expect(metadataAccountUpdate.isEncrypted).to.be.true;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members(Array.from(encryptedBytes));
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from(encryptedAesKey));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from(aesIv));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from(aesAuthTag));

    const decryptedAesKey = decryptAESKey(owner, byteAccountUpdate.aesKey);
    const decryptedBytes = decryptWithAESGCM(
        decryptedAesKey,
        byteAccountUpdate.bytes,
        byteAccountUpdate.aesIv,
        byteAccountUpdate.aesAuthTag,
    );

    expect(Array.from(decryptedAesKey)).to.have.same.members(Array.from(aesKey));
    expect(Array.from(decryptedBytes)).to.have.same.members(Array.from(bytes));

    await delay(1000);
  });

  it("it updates encrypted byte account version 2 to smaller bytes", async () => {
    const id = id1;
    const version = 2;
    const bytes = generateRandomByteArray(50);

    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    const aesKey = generateAESKey();
    const [encryptedBytes, aesIv, aesAuthTag] = encryptWithAESGCM(aesKey, bytes);
    const encryptedAesKey = encryptAESKey(owner, aesKey);

    await updateByteAccount(
        owner,
        id,
        version,
        encryptedBytes,
        encryptedAesKey,
        aesIv,
        aesAuthTag,
        Date.now() / 1000 + 86400
    );

    const byteAccountUpdate =
        await program.account.byteAccount.fetch(byteAccountPDA);

    const metadataAccountUpdate =
        await program.account.metadataAccount.fetch(metadataAccountPDA);

    expect(metadataAccountUpdate.bump).to.be.eq(metadataAccountBump);
    expect(metadataAccountUpdate.id).to.have.same.members(Array.from(id));
    expect(metadataAccountUpdate.version.toNumber()).to.be.eq(version);
    expect(Array.from(metadataAccountUpdate.owner.toBytes())).to.have.same.members(Array.from(owner.publicKey.toBytes()));
    expect(metadataAccountUpdate.size.toNumber()).to.be.eq(bytes.length);
    expect(metadataAccountUpdate.createdAtTs.toNumber()).to.be.gt(0);
    expect(metadataAccountUpdate.updatedAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.expiresAtTs.toNumber()).to.be.gt(metadataAccountUpdate.createdAtTs.toNumber());
    expect(metadataAccountUpdate.checksum).to.have.same.members(Array.from(await generateChecksum(encryptedBytes)));
    expect(metadataAccountUpdate.isEncrypted).to.be.true;
    expect(Array.from(metadataAccountUpdate.byteAccount.toBytes())).to.have.same.members(Array.from(byteAccountPDA.toBytes()));

    expect(byteAccountUpdate.bump).to.be.eq(byteAccountBump);
    expect(Array.from(byteAccountUpdate.bytes)).to.have.same.members(Array.from(encryptedBytes));
    expect(Array.from(byteAccountUpdate.aesKey)).to.have.same.members(Array.from(encryptedAesKey));
    expect(Array.from(byteAccountUpdate.aesIv)).to.have.same.members(Array.from(aesIv));
    expect(Array.from(byteAccountUpdate.aesAuthTag)).to.have.same.members(Array.from(aesAuthTag));

    const decryptedAesKey = decryptAESKey(owner, byteAccountUpdate.aesKey);
    const decryptedBytes = decryptWithAESGCM(
        decryptedAesKey,
        byteAccountUpdate.bytes,
        byteAccountUpdate.aesIv,
        byteAccountUpdate.aesAuthTag,
    );

    expect(Array.from(decryptedAesKey)).to.have.same.members(Array.from(aesKey));
    expect(Array.from(decryptedBytes)).to.have.same.members(Array.from(bytes));

    await delay(1000);
  });

  it("it deletes encrypted byte account version 1", async () => {
    const id = id1;
    const version = 1;

    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    await deleteByteAccount(owner, version, id);

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

  it("it deletes encrypted byte account version 2", async () => {
    const id = id1;
    const version = 2;

    const [byteAccountPDA, byteAccountBump] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA, metadataAccountBump] = getMetadataAccountPDA(id, version, owner);

    await deleteByteAccount(owner, version, id);

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

  it("it deletes encrypted version account", async () => {
    const id = id1;

    const [versionAccountPDA] = getVersionAccountPDA(id, owner);

    await deleteVersionAccount(owner, id);

    await program.account.versionAccount
        .fetch(versionAccountPDA)
        .then(() => expect(false).to.be.true)
        .catch(() => expect(true).to.be.true);

    await delay(1000);
  });

  async function createByteAccount(
      owner: anchor.web3.Keypair,
      id: Uint8Array,
      version: number,
      bytes: Uint8Array,
      aesKey?: Uint8Array,
      aesIV?: Uint8Array,
      aesAuthTag?: Uint8Array,
      expiresAtTs?: number
  ) {
    const [versionAccountPDA] = getVersionAccountPDA(id, owner);
    const [byteAccountPDA] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA] = getMetadataAccountPDA(id, version, owner);

    const transaction = new Transaction()
        .add(
            await program.methods
                .createByteAccount(
                    Array.from(id),
                    new BN(version),
                    Buffer.from(bytes),
                    aesKey ? Buffer.from(aesKey) : null,
                    aesIV ? Buffer.from(aesIV) : null,
                    aesAuthTag ? Buffer.from(aesAuthTag) : null,
                    expiresAtTs ? new BN(expiresAtTs) : null
                )
                .accountsStrict({
                  versionAccount: versionAccountPDA,
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
                        new BN(version),
                        Buffer.from(bytes),
                        aesKey ? Buffer.from(aesKey) : null,
                        aesIV ? Buffer.from(aesIV) : null,
                        aesAuthTag ? Buffer.from(aesAuthTag) : null,
                        expiresAtTs ? new BN(expiresAtTs) : null
                    )
                    .accountsStrict({
                      versionAccount: versionAccountPDA,
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

  async function appendByteAccount(
      owner: anchor.web3.Keypair,
      id: Uint8Array,
      version: number,
      bytes: Uint8Array,
  ) {
    const [byteAccountPDA] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA] = getMetadataAccountPDA(id, version, owner);

    const transaction = new Transaction()
        .add(
            await program.methods.appendByteAccount
                (
                    Buffer.from(bytes),
                )
                .accountsStrict({
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
                    .appendByteAccount(
                        Buffer.from(bytes),
                    )
                    .accountsStrict({
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
      version: number,
      bytes: Uint8Array,
      aesKey?: Uint8Array,
      aesIV?: Uint8Array,
      aesAuthTag?: Uint8Array,
      expiresAtTs?: number
  ) {
    const [byteAccountPDA] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA] = getMetadataAccountPDA(id, version, owner);

    const transaction = new Transaction()
        .add(
            await program.methods
                .updateByteAccount(
                    Buffer.from(bytes),
                    aesKey ? Buffer.from(aesKey) : null,
                    aesIV ? Buffer.from(aesIV) : null,
                    aesAuthTag ? Buffer.from(aesAuthTag) : null,
                    expiresAtTs ? new BN(expiresAtTs) : null
                )
                .accountsStrict({
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
                        aesKey ? Buffer.from(aesKey) : null,
                        aesIV ? Buffer.from(aesIV) : null,
                        aesAuthTag ? Buffer.from(aesAuthTag) : null,
                        expiresAtTs ? new BN(expiresAtTs) : null
                    )
                    .accountsStrict({
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
      version: number,
      id: Uint8Array
  ) {
    const [byteAccountPDA] = getByteAccountPDA(id, version, owner);
    const [metadataAccountPDA] = getMetadataAccountPDA(id, version, owner);

    const transaction = new Transaction()
        .add(
            await program.methods
                .deleteByteAccount()
                .accountsStrict({
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
                    .accountsStrict({
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

  async function deleteVersionAccount(
      owner: anchor.web3.Keypair,
      id: Uint8Array
  ) {
    const [versionAccountPDA] = getVersionAccountPDA(id, owner);

    const transaction = new Transaction()
        .add(
            await program.methods
                .deleteVersionAccount()
                .accountsStrict({
                  versionAccount: versionAccountPDA,
                  owner: owner.publicKey,
                })
                .transaction()
        )

    printTransaction(
        new Transaction()
            .add(
                await program.methods
                    .deleteVersionAccount()
                    .accountsStrict({
                      versionAccount: versionAccountPDA,
                      owner: owner.publicKey,
                    })
                    .transaction()
            ),
        "563MEMYqt2tQuaAM6aWwcfgsNdopaetuqABoEAiVnsAk",
        [owner]
    );

    await sendAndConfirmTransaction(connection, transaction, [owner]);
  }

  function getVersionAccountPDA(
      id: Uint8Array,
      owner: anchor.web3.Keypair,
  ) {
    return PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode("version_account"),
          owner.publicKey.toBytes(),
          Uint8Array.from(id)
        ],
        program.programId
    );
  }

  function getByteAccountPDA(
      id: Uint8Array,
      version: number,
      owner: anchor.web3.Keypair,
  ) {
    return PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode("byte_account"),
          owner.publicKey.toBytes(),
          Uint8Array.from(id),
          anchor.utils.bytes.utf8.encode(`${version}`)
        ],
        program.programId
    );
  }

  function getMetadataAccountPDA(
      id: Uint8Array,
      version: number,
      owner: anchor.web3.Keypair,
  ) {
    return PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode("metadata_account"),
          owner.publicKey.toBytes(),
          Uint8Array.from(id),
          anchor.utils.bytes.utf8.encode(`${version}`)
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

  function generateAESKey(keySize = 32): Buffer {
    return crypto.randomBytes(keySize);
  }

  function deriveRSAKeyPair(entropy: Uint8Array): forge.pki.rsa.KeyPair {
    const prng = forge.random.createInstance();
    prng.seedFileSync = function() {
      return forge.util.createBuffer(entropy).getBytes();
    };

    return forge.pki.rsa.generateKeyPair({ bits: 2048, prng: prng });
  }

  function encryptAESKey(keypair: Keypair, aesKey: Uint8Array): Uint8Array {
    const rsaKeypair = deriveRSAKeyPair(keypair.secretKey);
    const aesKeyBuffer = forge.util.createBuffer(aesKey);
    const encryptedBytes = rsaKeypair.publicKey.encrypt(aesKeyBuffer.getBytes());
    return forge.util.binary.raw.decode(encryptedBytes);
  }

  function decryptAESKey(keypair: Keypair, encryptedAESKey: Uint8Array): Uint8Array {
    const rsaKeypair = deriveRSAKeyPair(keypair.secretKey);
    const decryptedBytes = rsaKeypair.privateKey.decrypt(encryptedAESKey);
    return forge.util.binary.raw.decode(decryptedBytes);
  }

  function encryptWithAESGCM(key, data) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);

    const authTag = cipher.getAuthTag();

    return [
      new Uint8Array(encrypted),
      new Uint8Array(iv),
      new Uint8Array(authTag)
    ];
  }

  function decryptWithAESGCM(key: Uint8Array, encryptedData: Uint8Array, iv: Uint8Array, authTag: Uint8Array) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData);

    return Uint8Array.from(Buffer.concat([decrypted, decipher.final()]));
  }
});
