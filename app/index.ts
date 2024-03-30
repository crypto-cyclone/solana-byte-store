import {promptKeypair} from "./prompts/prompt-keypair";
import {Connection, Keypair} from "@solana/web3.js";
import {loadKeypairFromFile} from "./util/load-keypair-from-file";
import {promptInstruction} from "./prompts/prompt-instruction";
import {promptRpcUrl} from "./prompts/prompt-rpc-url";
import {AnchorProvider, setProvider, Wallet} from '@coral-xyz/anchor';
import {promptInstructionArguments} from "./prompts/prompt-instruction-arguments";
import {promptInstructionAccounts} from "./prompts/prompt-instruction-accounts";
import {KeypairState} from "./model/keypair-state";
import {RPCState} from "./model/rpc-state";
import {InstructionState} from "./model/instruction-state";
import {QueryState} from "./model/query-state";
import {promptInstructionOrQuery} from "./prompts/prompt-instruction-or-query";
import {promptQuery} from "./prompts/prompt-query";
import {promptQueryArguments} from "./prompts/prompt-query-arguments";
import {
    createByteAccount,
    prepareCreateByteAccountAccounts,
    prepareCreateByteAccountArguments, prepareCreateByteAccountOnArgument
} from "./instruction/create-byte-account";
import {
    prepareUpdateByteAccountAccounts,
    prepareUpdateByteAccountArguments, prepareUpdateByteAccountOnArgument,
    updateByteAccount
} from "./instruction/update-byte-account";
import {
    deleteByteAccount,
    prepareDeleteByteAccountAccounts,
    prepareDeleteByteAccountArguments, prepareDeleteByteAccountOnArgument
} from "./instruction/delete-byte-account";
import {getByteAccountById} from "./query/get-byte-account-by-id";
import {getMetadataAccountById} from "./query/get-metadata-account-by-id";
import {getByteAccountsByOwner} from "./query/get-byte-accounts-by-owner";
import {getMetadataAccountsByOwner} from "./query/get-metadata-accounts-by-owner";
import {promptEncryption} from "./prompts/prompt-encryption";
import {getDecryptedBytesById} from "./query/get-decrypted-bytes-by-id";
import {promptDefaultOwner} from "./prompts/prompt-default-owner";

async function main() {
    let keypairState = await setupKeypair();

    if (!keypairState.keypair) throw Error();

    let rpcState = await setupRPCURLState();

    if (!rpcState.rpcUrl) throw Error();

    setProvider(
        new AnchorProvider(
            new Connection(rpcState.rpcUrl),
            new Wallet(keypairState.keypair),
            {
                preflightCommitment: 'confirmed',
            })
    );

    let instructionOrQueryState = await setupInstructionOrQueryState(keypairState.keypair);

    const unknownActionError = new Error(`Unknown action`)

    if (instructionOrQueryState instanceof InstructionState) {
        if (!instructionOrQueryState.instruction) throw unknownActionError;

        await executeInstruction(
            instructionOrQueryState,
            [keypairState.keypair]
        );
    } else if (instructionOrQueryState instanceof QueryState) {
        if (!instructionOrQueryState.query) throw unknownActionError;

        await executeQuery(instructionOrQueryState, keypairState.keypair);
    } else {
        throw unknownActionError;
    }
}

async function setupKeypair(): Promise<KeypairState> {
    let state: KeypairState = KeypairState.factory({
        keypair: undefined,
    });

    while (true) {
        let keypairPath = await promptKeypair();

        if (keypairPath != null) {
            let keypair = loadKeypairFromFile(keypairPath);

            if (keypair != null) {
                state.keypair = keypair;
                break;
            }
        }
    }

    return state;
}

async function setupRPCURLState(): Promise<RPCState> {
    const state: RPCState = RPCState.factory({
        rpcUrl: undefined,
    });

    while (true) {
        let rpcUrl = await promptRpcUrl();

        if (rpcUrl != null) {
            state.rpcUrl = rpcUrl;
            break;
        }
    }

    return state;
}

async function setupInstructionOrQueryState(keypair: Keypair): Promise<InstructionState | QueryState> {
    while (true) {
        let instructionOrQuery = await promptInstructionOrQuery();

        if (instructionOrQuery == 'instruction') {
            return await setupInstructionState(keypair);
        } else if (instructionOrQuery == 'query') {
            return await setupQueryState(keypair);
        }
    }
}

async function setupInstructionState(keypair: Keypair): Promise<InstructionState> {
    const state: InstructionState = InstructionState.factory({
        instruction: undefined,
        arguments: undefined,
        accounts: undefined,
    });

    while (true) {
        let instruction = await promptInstruction();

        if (instruction != null) {
            state.instruction = instruction;

            let preparedArguments = null;
            let onArgument = null;

            switch (instruction) {
                case 'createByteAccount':
                    preparedArguments = prepareCreateByteAccountArguments();
                    onArgument = prepareCreateByteAccountOnArgument(
                        await promptEncryption(),
                        keypair
                    );

                    break;
                case 'updateByteAccount':
                    preparedArguments = prepareUpdateByteAccountArguments();
                    onArgument = prepareUpdateByteAccountOnArgument(
                        await promptEncryption(),
                        keypair
                    );

                    break;
                case 'deleteByteAccount':
                    preparedArguments = prepareDeleteByteAccountArguments();
                    onArgument = prepareDeleteByteAccountOnArgument();
            }

            let args = await promptInstructionArguments(
                instruction,
                preparedArguments,
                onArgument
            );

            if (args != null) {
                state.arguments = args

                let preparedAccounts = null;

                switch (instruction) {
                    case 'createByteAccount':
                        preparedAccounts = prepareCreateByteAccountAccounts(
                            args,
                            keypair.publicKey
                        );

                        break;
                    case 'updateByteAccount':
                        preparedAccounts = prepareUpdateByteAccountAccounts(
                            args,
                            keypair.publicKey
                        );

                        break;
                    case 'deleteByteAccount':
                        preparedAccounts = prepareDeleteByteAccountAccounts(
                            args,
                            keypair.publicKey
                        );
                }

                if (preparedAccounts != null) {
                    let accounts = await promptInstructionAccounts(
                        instruction,
                        preparedAccounts
                    );

                    if (accounts != null) {
                        state.accounts = accounts;
                        break;
                    }
                }
            }
        }
    }

    return state;
}

async function setupQueryState(keypair: Keypair): Promise<QueryState> {
    const state: QueryState = QueryState.factory({
        query: undefined,
        arguments: undefined,
    });

    while (true) {
        let query = await promptQuery();

        if (query != null) {
            state.query = query;

            const defaultOwner = await promptDefaultOwner();

            let preparedArguments = {};

            if (defaultOwner) {
                preparedArguments = { owner: keypair.publicKey.toBase58() }
            }

            let args = await promptQueryArguments(query, preparedArguments);

            if (args != null) {
                state.arguments = args
                break;
            }
        }
    }

    return state;
}

async function executeInstruction(state: InstructionState, signers: [Keypair]) {
    switch (state.instruction) {
        case 'createByteAccount':
            await createByteAccount(
                state.arguments,
                state.accounts,
                signers
            );

            break;
        case 'updateByteAccount':
            await updateByteAccount(
                state.arguments,
                state.accounts,
                signers
            );

            break;
        case 'deleteByteAccount':
            await deleteByteAccount(
                state.accounts,
                signers
            );
    }
}

async function executeQuery(state: QueryState, keypair: Keypair) {
    switch (state.query) {
        case 'get-byte-account':
            await getByteAccountById(state.arguments);

            break;
        case 'get-metadata-account':
            await getMetadataAccountById(state.arguments);

            break;

        case 'get-decrypted-bytes':
            await getDecryptedBytesById(state.arguments, keypair);

            break;
        case 'get-many-byte-accounts':
            await getByteAccountsByOwner(state.arguments);

            break;
        case 'get-many-metadata-accounts':
            await getMetadataAccountsByOwner(state.arguments);
    }
}

main();
