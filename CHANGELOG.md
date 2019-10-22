CHANGELOG

## v0.1.1 - _March 29, 2019_

    * Add support for environment variable WHITELIST_ALL_TOKENS.  If set (to any value), the whitelist will be set to '*'.

## v0.1.0 - _March 27, 2019_

    * Add the sorting of bids/asks for the GET /v2/orderbook endpoint as stated in the SRA v2:
      https://github.com/0xProject/standard-relayer-api/blob/master/http/v2.md#get-v2orderbook

## v0.0.2 - _February 5, 2019_

    * Fix bug where orders in DB weren't being added to OrderWatcher on re-start
    * Fix bug where order fillability wasn't being checked before being added to OrderWatcher & the database
