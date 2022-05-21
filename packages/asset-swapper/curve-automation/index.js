const APIURL = 'https://gateway.thegraph.com/api/[api-key]/subgraphs/id/4yx4rR6Kf8WH4RJPGhLSHojUxJzRWgEZb51iTran1sEG'
const Web3 = require("web3")
const urql = require("urql")
const web3 = new Web3("https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161")
const FileSystem = require("fs");


//curve registry ABI and address
contract_abi = require('./abi.json'); 
contract_address = '0xB9fC157394Af804a3578134A6585C0dc9cc990d4';

//curve registry contract
const curve_registry = new web3.eth.Contract(contract_abi, contract_address);

//curve pool count
async function getPoolCount() {
  const count = await curve_registry.methods.pool_count.call().call();
  return count;
}

//address of pool 
async function getPoolAddress(i) {
  address = await curve_registry.methods.pool_list(i).call();
  return address;
}

//coins in pool
async function getPoolCoins(address) {
  const coins = await curve_registry.methods.get_coins(address).call();
  return coins;
}

//liquidity in pool
async function getPoolLiquidity(address) {
  const liq = await curve_registry.methods.get_balances(address).call();
  const reducer = (accumulator, curr) => accumulator + curr;
  return liq.reduce(reducer);
}

//get pool volume using graphQL
//currently urql is not returning the pools volume
async function getPoolVolume(address) {
  //use formidable to query subgraph
  const tokensQuery = `
  query {
    tokens {
      id
      tokenID
      contentURI
      metadataURI
    }
  }
`

const client = createClient({
  url: APIURL,
})

const data = await client.query(tokensQuery).toPromise()
}

//pool type
async function getPoolType(address) {
  const pool_index = await curve_registry.methods.get_pool_asset_type(address).call();
  const pool_name = ["USD", "BTC", "ETH", "Other StableSwap", "CryptoSwap"];
  return pool_name[pool_index];
}

//pool name, address, coins, and pool type
async function poolInfo(address) {
  coins = await getPoolCoins(address);
  pool_type = await getPoolType(address);
  liq = await getPoolLiquidity(address);
  var Obj = {             
    coin: coins,
    poolType: pool_type,
    liquidity: liq  
  };
  return Obj;
}


//returns list of curve pools
async function getCurvePools() {
  const ret = {};
  pool_count = await getPoolCount();

  for (let i = 0; i < pool_count; i++) {
    const info = {};
    address = await getPoolAddress(i);
    pool_info = await poolInfo(address);
    ret[address] = pool_info;
  }
  FileSystem.writeFile('curve.json', JSON.stringify(ret), (error) => {
    if (error) throw error;
  });

}
//getCurvePools();

getCurvePools();


