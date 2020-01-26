import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as dirtyChai from 'dirty-chai';

chai.use(dirtyChai);
chai.use(chaiAsPromised);
export const expect = chai.expect;
