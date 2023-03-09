import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { config } from 'dotenv';

// Use the custom .env file
config({ path: './test/test_env' });

// Use chai as promied
chai.use(chaiAsPromised);

// Silence calls to `logger` in code under test.
// Comment out this line to see logger output.
process.env.LOG_LEVEL = 'silent';
