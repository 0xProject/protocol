import Axios from 'axios';
import * as rax from 'retry-axios';

const retryableAxiosInstance = Axios.create();
// Attach retry-axios only to our specific instance
rax.attach(retryableAxiosInstance);
