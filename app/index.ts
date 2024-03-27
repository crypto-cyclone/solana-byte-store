import {promptKeypair} from "./prompts/prompt-keypair";
import {Connection, Keypair, PublicKey, SystemProgram} from "@solana/web3.js";
import {loadKeypairFromFile} from "./util/load_keypair_ff";
import {promptInstruction} from "./prompts/prompt-instruction";
import {promptRpcUrl} from "./prompts/prompt-rpc-url";
import {AnchorProvider, Program, setProvider, Wallet} from '@coral-xyz/anchor';
import {promptInstructionArguments} from "./prompts/prompt-instruction-arguments";
import {promptInstructionAccounts} from "./prompts/prompt-instruction-accounts";
import {prepareCreateEscrowAccounts, prepareCreateEscrowArguments} from "./instruction/create-escrow";
import {prepareUpdateEscrowAccounts, prepareUpdateEscrowArguments} from "./instruction/update-escrow";
import {prepareDeleteEscrowAccounts, prepareDeleteEscrowArguments} from "./instruction/delete-escrow";

interface KeypairState {
    keypair: Keypair | undefined,
}

interface InstructionState {
    instruction: string | undefined,
    arguments: Record<string, any> | undefined,
    accounts: Record<string, string> | undefined,
}

interface RPCState {
    rpcUrl: string | undefined,
}

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

    let instructionState = await setupInstructionState(keypairState.keypair);

    if (!instructionState.instruction) throw Error();

    console.log(instructionState);
}

async function setupKeypair(): Promise<KeypairState> {
    let state: KeypairState = {
        keypair: undefined,
    };

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
    const state: RPCState = {
        rpcUrl: undefined,
    };

    while (true) {
        let rpcUrl = await promptRpcUrl();

        if (rpcUrl != null) {
            state.rpcUrl = rpcUrl;
            break;
        }
    }

    return state;
}

async function setupInstructionState(keypair: Keypair): Promise<InstructionState> {
    const state: InstructionState = {
        instruction: undefined,
        arguments: undefined,
        accounts: undefined,
    };

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

main();
