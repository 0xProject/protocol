export class UserDoesNotExistExeption extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, UserDoesNotExistExeption.prototype);
  }
}
