import { expect } from '@0x/contracts-test-utils';

import { isHashSmallEnough } from '../../src/utils/hash_utils';

describe('isRolledOut', () => {
    it('should give a consistent result for the same message', () => {
        const message = 'hello world';
        const threshold = 0.5;

        const first = isHashSmallEnough({ message, threshold });
        const second = isHashSmallEnough({ message, threshold });
        const third = isHashSmallEnough({ message, threshold });

        expect(first).to.eq(second);
        expect(second).to.eq(third);
    });

    it('should partition the rollout group to the approximate threshold target', () => {
        const population = 1000;
        const threshold = 0.1;
        let rolloutCount = 0;

        for (let i = 0; i < population; i++) {
            if (isHashSmallEnough({ message: i, threshold })) {
                rolloutCount++;
            }
        }
        expect(rolloutCount).to.eq(102); // approximately 100
    });

    it('should roll out for 100%', () => {
        const population = 1000;
        const threshold = 1;
        let rolloutCount = 0;

        for (let i = 0; i < population; i++) {
            if (isHashSmallEnough({ message: i.toString(), threshold })) {
                rolloutCount++;
            }
        }
        expect(rolloutCount).to.eq(1000);
    });
});
