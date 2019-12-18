import { Schema, SchemaValidator } from '@0x/json-schemas';
import { ValidationError as SchemaValidationError } from 'jsonschema';

import { ValidationError, ValidationErrorCodes, ValidationErrorItem } from '../errors';

const schemaValidator = new SchemaValidator();

export const schemaUtils = {
    validateSchema(instance: any, schema: Schema): void {
        const validationResult = schemaValidator.validate(instance, schema);
        if (validationResult.errors.length === 0) {
            return;
        } else {
            const validationErrorItems = validationResult.errors.map((schemaValidationError: SchemaValidationError) =>
                schemaValidationErrorToValidationErrorItem(schemaValidationError),
            );
            throw new ValidationError(validationErrorItems);
        }
    },
    addSchema(schema: Schema): void {
        schemaValidator.addSchema(schema);
    },
};

function schemaValidationErrorToValidationErrorItem(schemaValidationError: SchemaValidationError): ValidationErrorItem {
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
        ].includes(schemaValidationError.name)
    ) {
        return {
            field: schemaValidationError.property,
            code: ValidationErrorCodes.IncorrectFormat,
            reason: schemaValidationError.message,
        };
    } else if (
        ['minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'enum', 'const'].includes(
            schemaValidationError.name,
        )
    ) {
        return {
            field: schemaValidationError.property,
            code: ValidationErrorCodes.ValueOutOfRange,
            reason: schemaValidationError.message,
        };
    } else if (schemaValidationError.name === 'required') {
        return {
            field: schemaValidationError.argument,
            code: ValidationErrorCodes.RequiredField,
            reason: schemaValidationError.message,
        };
    } else if (schemaValidationError.name === 'not') {
        return {
            field: schemaValidationError.property,
            code: ValidationErrorCodes.UnsupportedOption,
            reason: schemaValidationError.message,
        };
    } else {
        throw new Error(`Unknnown schema validation error name: ${schemaValidationError.name}`);
    }
}
