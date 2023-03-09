# Quote Requestor in `0x-rfq-api`

> TODO(MKR-407): Remove entire directory once RFQt v1 is deprecated.

This is a near copy-paste of `0x/asset-swapper/utils/quote_requestor` at version `16.55.0`.

This is to facilitate a transition from having RFQt logic in `0x-api` to having the logic
in `0x-rfq-api`.

RFQt v1 logic will use this copy of Quote Requestor.

## Changes made during copy-paste

-   Remove injected loggers
-   Some constants replaced with constants already in the repo
-   Remove RFQm code
-   Remove the `headers` constraint on what the mock network calls will match on
