import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import zxcvbnEnPackage from '@zxcvbn-ts/language-en';
import * as bcrypt from 'bcrypt';

export async function validatePassword(input: string) {
    //check that the password score is 4
    if (checkPassword(input).score < 4) {
        throw new Error('Password is too weak');
    } else {
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(input, salt);

        return [salt, passwordHash];
    }
}

function checkPassword(input: string) {
    //zxcvbn options for evaluating password strength
    const options = {
        translations: zxcvbnEnPackage.translations,
        graphs: zxcvbnCommonPackage.adjacencyGraphs,
        dictionary: {
            ...zxcvbnCommonPackage.dictionary,
            ...zxcvbnEnPackage.dictionary,
        },
    };

    zxcvbnOptions.setOptions(options);

    //evaluate password strength, returns an integer from 0-4
    return zxcvbn(input);
}

export function verifyPassword(input: { password: string; passwordHash: string }) {
    return bcrypt.compare(input.password, input.passwordHash);
}
