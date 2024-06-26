import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import inquirer from 'inquirer';

export async function promptQuery(): Promise<string | undefined> {
    const querys = [
        'get-version-account',
        'get-byte-account',
        'get-metadata-account',
        'get-decrypted-bytes',
        'get-decrypted-bytes-for-n-versions',
        'get-many-version-accounts',
        'get-many-byte-accounts',
        'get-byte-accounts-for-n-versions',
        'get-many-metadata-accounts'
    ];

    const argv = yargs(hideBin(process.argv))
        .option('query', {
            alias: 'q',
            description: 'The query action to execute',
            type: 'string',
            choices: querys,
        })
        .help()
        .alias('help', 'h')
        .version(false)
        .argv;

    async function promptForQueryAction(): Promise<string> {
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'query',
                message: 'Select the query action you want to execute:',
                choices: querys.map((action) => {
                    return { name: action, value: action };
                }),
            },
        ]);

        return answers.query;
    }

    let queryAction = argv['query'];

    if (!queryAction) {
        return await promptForQueryAction();
    }

    return queryAction;
}
