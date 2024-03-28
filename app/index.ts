import {promptKeypair} from "./prompts/prompt-keypair";
import {Connection, Keypair, PublicKey} from "@solana/web3.js";
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
    prepareCreateByteAccountArguments
} from "./instruction/create-byte-account";
import {
    prepareUpdateByteAccountAccounts,
    prepareUpdateByteAccountArguments,
    updateByteAccount
} from "./instruction/update-byte-account";
import {
    deleteByteAccount,
    prepareDeleteByteAccountAccounts,
    prepareDeleteByteAccountArguments
} from "./instruction/delete-byte-account";
import {getByteAccountById} from "./query/get-byte-account-by-id";
import {getMetadataAccountById} from "./query/get-metadata-account-by-id";
import {getByteAccountsByOwner} from "./query/get-byte-accounts-by-owner";
import {getMetadataAccountsByOwner} from "./query/get-metadata-accounts-by-owner";

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

        await executeQuery(instructionOrQueryState);
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
            return await setupQueryState();
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

            switch (instruction) {
                case 'createByteAccount':
                    preparedArguments = prepareCreateByteAccountArguments()

                    break;
                case 'updateByteAccount':
                    preparedArguments = prepareUpdateByteAccountArguments()

                    break;
                case 'deleteByteAccount':
                    preparedArguments = prepareDeleteByteAccountArguments()
            }

            let args = await promptInstructionArguments(
                instruction,
                preparedArguments
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

async function setupQueryState(): Promise<QueryState> {
    const state: QueryState = QueryState.factory({
        query: undefined,
        arguments: undefined,
    });

    while (true) {
        let query = await promptQuery();

        if (query != null) {
            state.query = query;

            let args = await promptQueryArguments(query);

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

async function executeQuery(state: QueryState) {
    switch (state.query) {
        case 'get-byte-account':
            await getByteAccountById(state.arguments);

            break;
        case 'get-metadata-account':
            await getMetadataAccountById(state.arguments);

            break;
        case 'get-many-byte-accounts':
            await getByteAccountsByOwner(state.arguments);

            break;
        case 'get-many-metadata-accounts':
            await getMetadataAccountsByOwner(state.arguments);
    }
}

main();
