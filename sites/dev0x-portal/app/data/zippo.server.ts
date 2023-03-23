export function doesSessionExist(_userId: string, _sessionToken: string) {
    // currently stubbed, but this is where we would check with the backend to see if the session is still valid
    return true;
}

export async function createUserWithEmailAndPassword(
    _firstName: string,
    _lastName: string,
    _email: string,
    _password: string,
): Promise<boolean> {
    // currently stubbed, but this is where we would check with the backend to create a new user
    return true;
}

export async function sendVerificationEmail(_email: string): Promise<void> {
    console.log('Verification email sent');
    // currently stubbed, but this is where we would check with the backend to send a verification email
}

export async function verifyEmailVerificationToken(_email: string, _token: string): Promise<boolean> {
    // currently stubbed, but this is where we would check with the backend to verify the email verification token
    return _token === '1337-420-69';
}

export async function createTeam(_userId: string, _teamName: string, _teamType: string): Promise<string> {
    // currently stubbed, but this is where we would check with the backend to create a new team
    return _teamName;
}

export async function sendResetPasswordEmail(_email: string): Promise<void> {
    console.log('Reset password email sent');
    // currently stubbed, but this is where we would check with the backend to send a reset password email
}

export async function resetPassword(_email: string, _password: string, _token: string): Promise<boolean> {
    // currently stubbed, but this is where we would check with the backend to verify the password reset token
    return _token === '1337-420-69';
}
