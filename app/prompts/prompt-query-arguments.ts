import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import inquirer from 'inquirer';

const queryArgumentsConfig = {
    'get-byte-account': [{ name: 'owner', type: 'string' }, { name: 'id', type: 'string' }],
    'get-metadata-account': [{ name: 'owner', type: 'string' }, { name: 'id', type: 'string' }],
    'get-many-byte-accounts': [{ name: 'owner', type: 'string' }],
    'get-many-metadata-accounts': [{ name: 'owner', type: 'string' }]
};

export async function promptQueryArguments(queryAction: string): Promise<Record<string, any>> {
    const queryArgs = queryArgumentsConfig[queryAction];

    if (!queryArgs) {
        throw new Error(`Query action ${queryAction} not found or does not have predefined arguments.`);
    }

    let argvBuilder = yargs(hideBin(process.argv));
    queryArgs.forEach(arg => {
        argvBuilder = argvBuilder.option(arg.name, {
            alias: `arg-${arg.name}`,
            description: `Value for ${arg.name}`,
            type: arg.type,
        });
    });

    const argv = argvBuilder.help().alias('help', 'h').argv;

    async function promptForArgument(arg: { name: string, type: string }): Promise<any> {
        if (argv[arg.name] !== undefined) {
            return argv[arg.name];
        }

        const answer = await inquirer.prompt([{
            type: 'input',
            name: arg.name,
            message: `Enter value for ${arg.name}:`
        }]);

        return answer[arg.name];
    }

    const argValues: Record<string, any> = {};

    for (const arg of queryArgs) {
        argValues[arg.name] = await promptForArgument(arg);
    }

    for (const argValue in argValues) {
        if (argValues[argValue].trim().length == 0) {
            delete argValues[argValue];
        }
    }

    return argValues;
}
