import {promptKeypair} from "./prompts/prompt-keypair";
import {Connection, Keypair} from "@solana/web3.js";
import {loadKeypairFromFile} from "./util/load-keypair-from-file";
import {promptInstruction} from "./prompts/prompt-instruction";
import {promptRpcUrl} from "./prompts/prompt-rpc-url";
import {AnchorProvider, setProvider, Wallet} from '@coral-xyz/anchor';
import {promptInstructionArguments} from "./prompts/prompt-instruction-arguments";
import {promptInstructionAccounts} from "./prompts/prompt-instruction-accounts";
import {prepareCreateEscrowAccounts, prepareCreateEscrowArguments} from "./instruction/create-escrow";
import {prepareUpdateEscrowAccounts, prepareUpdateEscrowArguments} from "./instruction/update-escrow";
import {prepareDeleteEscrowAccounts, prepareDeleteEscrowArguments} from "./instruction/delete-escrow";
import {KeypairState} from "./model/keypair-state";
import {RPCState} from "./model/rpc-state";
import {InstructionState} from "./model/instruction-state";
import {QueryState} from "./model/query-state";
import {promptInstructionOrQuery} from "./prompts/prompt-instruction-or-query";
import {promptQuery} from "./prompts/prompt-query";
import {promptQueryArguments} from "./prompts/prompt-query-arguments";

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
    } else if (instructionOrQueryState instanceof QueryState) {
        if (!instructionOrQueryState.query) throw unknownActionError;
    } else {
        throw unknownActionError;
    }

    console.log(instructionOrQueryState);
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
                    preparedArguments = prepareCreateEscrowArguments();

                    break;
                case 'updateByteAccount':
                    preparedArguments = prepareUpdateEscrowArguments();

                    break;
                case 'deleteByteAccount':
                    preparedArguments = prepareDeleteEscrowArguments();
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
                        preparedAccounts = prepareCreateEscrowAccounts(
                            args,
                            keypair.publicKey
                        );

                        break;
                    case 'updateByteAccount':
                        preparedAccounts = prepareUpdateEscrowAccounts(
                            args,
                            keypair.publicKey
                        );

                        break;
                    case 'deleteByteAccount':
                        preparedAccounts = prepareDeleteEscrowAccounts(
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

main();
