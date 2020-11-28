import json

####
#### Run from `root/docs` directory. Generates `root/docs/basics/addresses.rst`
####


sections = [
    
    # Exchange V4
    {
        "name": "Exchange V4",
        "contracts": [
            'exchangeProxy',
            'exchangeProxyAllowanceTarget',
            'exchangeProxyFlashWallet',
            'exchangeProxyGovernor',
            'exchangeProxyLiquidityProviderSandbox',
            'exchangeProxyTransformerDeployer'
        ]
    },

    # Exchange V4 transformers
    {
        "name": "Transformers",
        "contracts": [
            "transformers"
        ]
    },

    # ZRX / Staking
    {
        "name": "ZRX / Staking",
        "contracts": [
            'staking',
            'stakingProxy',
            'zrxToken',
            'zrxVault'
        ]
    },

    # Miscellaneous
    {
        "name": "Miscellaneous",
        "contracts": [
            'devUtils',
            'etherToken',
            'erc20BridgeSampler'
        ]
    }
]

def printRow(contract, address):
    etherscanLink = "%s/%s"%("https://etherscan.io/address/", address)
    print("    %s, `%s <%s>`_"%(contract, address, etherscanLink)) 

def printTable(contracts, addresses):
    print(".. csv-table::\n")
    for contract in contracts:
        if isinstance(addresses[contract], unicode):
            printRow(contract, addresses[contract])
        else:
            for contract,address in addresses[contract].items():
                printRow(contract, address)
                

print(
'''
###############################
Addresses
###############################

.. note::
    This page is auto-generated. See the `contract-addresses <https://github.com/0xProject/protocol/blob/development/packages/contract-addresses/addresses.json>`_ package for an exhaustive list of contracts across all networks.
'''
)

with open('../packages/contract-addresses/addresses.json') as f:
    addresses = json.load(f)
    for section in sections:
        print("%s\n==================="%(section["name"]))
        printTable(section["contracts"], addresses["1"])
        print("\n\n")

