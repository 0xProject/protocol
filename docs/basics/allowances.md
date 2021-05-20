---
title: Allowances
---

Both maker and taker allowance should be be set directly on the
[Exchange Proxy contract](./addresses.html#exchange-v4).

For takers, legacy allowances set on the [Allowance
Target](./addresses.html#exchange-v4) will continue to work during this
transition period but will suffer a gas penalty. It\'s highly encouraged
to migrate allowances over to the Exchange Proxy as soon as possible to
avoid interruption.
