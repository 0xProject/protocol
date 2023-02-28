import { AJV, SchemaValidator } from '@0x/json-schemas';

import { ValidationError, ValidationErrorCodes, ValidationErrorItem } from '../errors';
import { schemas } from '../schemas';

const schemaValidator = new SchemaValidator();
for (const schema of Object.values(schemas)) {
    if (schema !== undefined) {
        schemaValidator.addSchema(schema);
    }
}

export const schemaUtils = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validateSchema(instance: any, schema: object): void {
        const validationResult = schemaValidator.validate(instance, schema);
        if (!validationResult.errors || validationResult.errors.length === 0) {
            return;
        } else {
            const validationErrorItems = validationResult.errors.map((schemaValidationError) =>
                schemaValidationErrorToValidationErrorItem(schemaValidationError),
            );
            throw new ValidationError(validationErrorItems);
        }
    },
    addSchema(schema: object): void {
        schemaValidator.addSchema(schema);
    },
};

interface ValidationErrorObject extends AJV.ErrorObject {
    description?: string;
}

function schemaValidationErrorToValidationErrorItem(
    schemaValidationErrorObject: ValidationErrorObject,
): ValidationErrorItem {
    const description = schemaValidationErrorObject.description;
    const reason = schemaValidationErrorObject.message || '';

    if (
        [
            'type',
            'anyOf',
            'allOf',
            'oneOf',
            'additionalProperties',
            'minProperties',
            'maxProperties',
            'pattern',
            'format',
            'uniqueItems',
            'items',
            'dependencies',
        ].includes(schemaValidationErrorObject.keyword)
    ) {
        return {
            field: schemaValidationErrorObject.dataPath.replace('.', ''),
            code: ValidationErrorCodes.IncorrectFormat,
            reason,
            ...(description && { description }),
        };
    } else if (
        ['minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'enum', 'const'].includes(
            schemaValidationErrorObject.keyword,
        )
    ) {
        return {
            field: schemaValidationErrorObject.dataPath.replace('.', ''),
            code: ValidationErrorCodes.ValueOutOfRange,
            reason,
            ...(description && { description }),
        };
    } else if (schemaValidationErrorObject.keyword === 'required') {
        return {
            field: (schemaValidationErrorObject.params as AJV.RequiredParams).missingProperty,
            code: ValidationErrorCodes.RequiredField,
            reason,
            ...(description && { description }),
        };
    } else if (schemaValidationErrorObject.keyword === 'not') {
        return {
            field: schemaValidationErrorObject.dataPath.replace('.', ''),
            code: ValidationErrorCodes.UnsupportedOption,
            reason,
            ...(description && { description }),
        };
    } else {
        throw new Error(`Unknown schema validation error name: ${schemaValidationErrorObject.keyword}`);
    }
}
