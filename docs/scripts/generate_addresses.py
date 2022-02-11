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

networks = {
    '1': 'Ethereum',
    '10': 'Optimism',
    '56': 'Binance Smart Chain',
    '137': 'Polygon',
    '43114': 'Avalanche',
    '250': 'Fantom',
    '42220': 'Celo',
}

etherscanByNetwork = {
    '1': 'https://etherscan.io/address',
    '10': 'https://optimistic.etherscan.io/address',
    '56': 'https://bscscan.com/address',
    '137': 'https://polygonscan.com/address',
    '43114': 'https://snowtrace.io/address',
    '250': 'https://ftmscan.com/address',
    '42220': 'https://explorer.celo.org/address',
}


def getLinkableAddress(address, network):
    etherscanLink = "%s/%s"%(etherscanByNetwork[network], address)
    return "`%s <%s>`__"%(address, etherscanLink)

def printRow(contract, address, network):
    etherscanLink = "%s/%s"%(etherscanByNetwork[network], address)
    print("    %s, %s"%(contract, getLinkableAddress(address, network)))

def printTable(contracts, addresses, network):
    print(".. csv-table::\n")
    for contract in contracts:
        if isinstance(addresses[contract], str):
            printRow(contract, addresses[contract], network)
        else:
            for contract,address in addresses[contract].items():
                printRow(contract, address, network)
                

print(
'''
###############################
Addresses
###############################

.. note::
    This page is auto-generated. See the `contract-addresses <https://github.com/0xProject/protocol/blob/development/packages/contract-addresses/addresses.json>`_ package for an exhaustive list of contracts across all networks.

    The Exchange Proxy may have different addresses on various networks, see the `Exchange Proxy Addresses <./addresses.html#exchange-proxy-addresses>`__ table for an exhaustive list.
'''
)

with open('../packages/contract-addresses/addresses.json') as f:
    addresses = json.load(f)
    for section in sections:
        print("%s\n==================="%(section["name"]))
        printTable(section["contracts"], addresses["1"], "1")
        print("\n\n")
    print("Exchange Proxy Addresses \n=========================")
    print("Note: Some addresses have changed across various networks\n")
    print(".. csv-table::\n")
    for network in networks:
        # etherscanLink = "%s/%s"%("https://etherscan.io/address/", address)
        # print("    %s, `%s <%s>`_"%(contract, address, etherscanLink)) 
        print("    %s, %s"%(networks[network], getLinkableAddress(addresses[network]["exchangeProxy"], network))) 

