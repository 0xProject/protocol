export const numberUtils = {
    // from MDN https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
    randomNumberInclusive: (minimumSpecified: number, maximumSpecified: number): number => {
        const min = Math.ceil(minimumSpecified);
        const max = Math.floor(maximumSpecified);
        return Math.floor(Math.random() * (max - min + 1)) + min; // The maximum is inclusive and the minimum is inclusive
    },
    // creates a random hex number of desired length by stringing together
    // random integers from 1-15, guaranteeing the
    // result is a hex number of the given length
    randomHexNumberOfLength: (numberLength: number): string => {
        let res = '';
        for (let i = 0; i < numberLength; i++) {
            // tslint:disable-next-line:custom-no-magic-numbers
            res = `${res}${numberUtils.randomNumberInclusive(1, 15).toString(16)}`;
        }
        return res;
    },
};
