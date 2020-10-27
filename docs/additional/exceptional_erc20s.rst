###############################
Exceptional ERC20s
###############################

Some ERC20s have unique behavior that may require extra handling. We document these here as they are discovered.

Assert vs Require
-----------------
These ERC20's use `assert` instead of `require`, which means that if the token reverts then (nearly) all
of the gas from your transaction will be consumed. Specifically, you are left with 1/64 of the gas limit.
Be mindful of this when implementing fallback logic; for example, if a call to `transferFrom` reverts then
note you will only have 1/64 of the gas limit to handle the exception.

Known tokens:

- KNC
- LINK
- sUSD
- USDT
