import { ObjectMap } from '../types';

export const utils = {
    arrayToMapWithId: <T extends object>(array: T[], idKey: keyof T): ObjectMap<T> => {
        const initialMap: ObjectMap<T> = {};
        return array.reduce((acc, val) => {
            const id = val[idKey] as any;
            acc[id] = val;
            return acc;
        }, initialMap);
    },
};
