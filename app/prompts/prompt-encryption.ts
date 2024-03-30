import yargs from "yargs/yargs";
import {hideBin} from "yargs/helpers";
import inquirer from "inquirer";

export async function promptEncryption(): Promise<boolean> {
    const argv = yargs(hideBin(process.argv))
        .option('encrypt', {
            alias: 'e',
            description: 'Enable encryption for instruction bytes',
            type: 'boolean',
        })
        .help()
        .alias('help', 'h')
        .argv;

    async function promptForEncryption(): Promise<boolean> {
        const answer = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'encrypt',
                message: 'Do you wish to enable encryption on the instruction bytes?',
                default: false,
            }
        ]);

        return answer.encrypt;
    }

    let encrypt = argv['encrypt'];

    if (encrypt == null) {
        return await promptForEncryption();
    }

    return encrypt;
}