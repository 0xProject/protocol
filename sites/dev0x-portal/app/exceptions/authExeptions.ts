export class UserDoesNotExistException extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, UserDoesNotExistException.prototype);
    }
}
