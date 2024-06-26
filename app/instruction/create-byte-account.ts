import {Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction} from "@solana/web3.js";
import {getProgramFromIDl} from "../util/get-program-from-idl";
import BN from "bn.js";
import {getByteAccountPDA} from "../pda/byte-account";
import {getMetadataAccountPDA} from "../pda/metadata-account";
import {getProvider} from "@coral-xyz/anchor";
import {padBytesEnd} from "../util/pad-bytes";
import {generateAESKey} from "../util/generate-aes-key";
import {encryptAESKey} from "../util/encrypt-aes-key";
import {encryptBytesAES} from "../util/encrypt-bytes-aes";
import {getVersionAccountPDA} from "../pda/version-account";
const Spinner = require('cli-spinner').Spinner;

export function prepareCreateByteAccountOnArgument(encryptionEnabled: boolean, keypair: Keypair): (argv: any, argValues: any) => void {
    return async (argv, argValues) => {
        const bytesBase64 = argv['bytes'] ?? argValues['bytes'];

        if (!encryptionEnabled) {
            argv['aesKey'] = '';
            argv['aesIv'] = '';
            argv['aesAuthTag'] = '';
        } else if (bytesBase64 != null && (argv['bytes'] == null || argv['aesKey'] == null || argv['aesAuthTag'] == null)) {

            const spinner = new Spinner('%s Encrypting bytes...');
            spinner.setSpinnerString(2);
            spinner.start();

            await new Promise(resolve => {
                const aesKey = generateAESKey();
                const encryptedAesKey = encryptAESKey(keypair, aesKey);
                const bytes = Buffer.from(bytesBase64, 'base64');
                const [encryptedBytes, aesIv, aesAuthTag] = encryptBytesAES(aesKey, bytes);

                argv['bytes'] = Buffer.from(encryptedBytes).toString('base64');
                argValues['bytes'] = Buffer.from(encryptedBytes).toString('base64');

                argv['aesKey'] = Buffer.from(encryptedAesKey).toString('hex');
                argValues['aesKey'] = Buffer.from(encryptedAesKey).toString('hex');

                argv['aesIv'] = Buffer.from(aesIv).toString('hex');
                argValues['aesIv'] = Buffer.from(aesIv).toString('hex');

                argv['aesAuthTag'] = Buffer.from(aesAuthTag).toString('hex');
                argValues['aesAuthTag'] = Buffer.from(aesAuthTag).toString('hex');

                resolve(null);
            });

            spinner.stop(true);
        }
    };
}

export function prepareCreateByteAccountArguments(): string[] {
    return [];
}

export function prepareCreateByteAccountAccounts(
    args: Record<string, any>,
    owner: PublicKey
): Record<string, string> {
    const id = args['id'] as string;
    const version = args['version'] as number;

    if (id == null) {
        throw new Error(`prepareCreateByteAccountAccounts argument id not found.`);
    }

    if (version == null) {
        throw new Error(`prepareCreateByteAccountAccounts argument version not found.`);
    }

    const idBytes = padBytesEnd(
        Uint8Array.from(
            Buffer.from(id, 'utf8')
        ),
        32
    );

    if (idBytes.length > 32) {
        throw new Error('id could not fit within 32 bytes')
    }

    const [versionAccountPDA] = getVersionAccountPDA(
        owner,
        idBytes
    );

    const [byteAccountPDA] = getByteAccountPDA(
        owner,
        idBytes,
        version,
    );

    const [metadataAccountPDA] = getMetadataAccountPDA(
        owner,
        idBytes,
        version
    );

    return {
        versionAccount: versionAccountPDA.toBase58(),
        byteAccount: byteAccountPDA.toBase58(),
        metadataAccount: metadataAccountPDA.toBase58(),
        owner: owner.toBase58(),
        systemProgram: SystemProgram.programId.toBase58()
    }
}

export async function createByteAccount(
    args: Record<string, any>,
    accounts: Record<string, string>,
    signers: [Keypair]
) {
    const program = getProgramFromIDl();

    const id = args['id'] as string;
    const version = args['version'] as number;
    const bytes = args['bytes'] as string;
    const aesKey: string | undefined = args['aesKey'];
    const aesIv: string | undefined = args['aesIv'];
    const aesAuthTag: string | undefined = args['aesAuthTag'];
    const expiresAtTs: string | undefined = args['expiresAtTs'];

    const transaction = new Transaction()
        .add(
            await program.methods
                .createByteAccount(
                    Array.from(Buffer.from(id, 'utf8')),
                    new BN(version),
                    Buffer.from(bytes, 'base64'),
                    aesKey ? Buffer.from(aesKey, 'hex') : null,
                    aesIv ? Buffer.from(aesIv, 'hex') : null,
                    aesAuthTag ? Buffer.from(aesAuthTag, 'hex') : null,
                    expiresAtTs ? new BN(expiresAtTs) : null
                )
                .accounts({
                    versionAccount: accounts['versionAccount'],
                    byteAccount: accounts['byteAccount'],
                    metadataAccount: accounts['metadataAccount'],
                    owner: accounts['owner'],
                    systemProgram: accounts['systemProgram']
                })
                .transaction()
        );

    await sendAndConfirmTransaction(
        getProvider().connection,
        transaction,
        signers
    )
        .catch((err) => console.log(`failed to execute createByteAccount`, err))
        .then(() => console.log('executed createByteAccount'));
}