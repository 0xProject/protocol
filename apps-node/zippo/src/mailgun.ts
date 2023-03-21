import { env } from './env';

import formData from 'form-data';
import Mailgun from 'mailgun.js';

const mailgun = new Mailgun(formData);
const mailgunClient = mailgun.client({
    username: 'api',
    key: env.MAILGUN_KEY,
});

export default mailgunClient;
