# create services
curl -i -X POST http://127.0.0.1:8001/services --data name=swap_v1_service --data url='http://mockbin.org'
curl -i -X POST http://127.0.0.1:8001/services --data name=orderbook_v1_service --data url='http://mockbin.org'

# create and map route to services
curl -i -X POST http://127.0.0.1:8001/services/swap_v1_service/routes --data name=swap_price_v1_route_optimism --data 'hosts[]=optimism.api.0x.org' --data 'paths[]=/swap/v1/price'
curl -i -X POST http://127.0.0.1:8001/services/swap_v1_service/routes --data name=swap_price_v1_route_fantom --data 'hosts[]=fantom.api.0x.org' --data 'paths[]=/swap/v1/price'
curl -i -X POST http://127.0.0.1:8001/services/swap_v1_service/routes --data name=swap_quote_v1_route_optimism --data 'hosts[]=optimism.api.0x.org' --data 'paths[]=/swap/v1/quote'
curl -i -X POST http://127.0.0.1:8001/services/swap_v1_service/routes --data name=swap_quote_v1_route_fantom --data 'hosts[]=fantom.api.0x.org' --data 'paths[]=/swap/v1/quote'
curl -i -X POST http://127.0.0.1:8001/services/orderbook_v1_service/routes --data name=orderbook_v1_route_optimism --data 'hosts[]=optimism.api.0x.org' --data 'paths[]=/orderbook/v1'
curl -i -X POST http://127.0.0.1:8001/services/orderbook_v1_service/routes --data name=orderbook_v1_route_fantom --data 'hosts[]=fantom.api.0x.org' --data 'paths[]=/orderbook/v1'

# enable key auth on routes
curl -i -X POST http://127.0.0.1:8001/routes/swap_price_v1_route_optimism/plugins --data name=key-auth --data "config.key_in_query=false" --data "config.key_names=0x-api-key" --data "config.anonymous=0x_anonymous"
curl -i -X POST http://127.0.0.1:8001/routes/swap_price_v1_route_fantom/plugins --data name=key-auth --data "config.key_in_query=false" --data "config.key_names=0x-api-key" --data "config.anonymous=0x_anonymous"
curl -i -X POST http://127.0.0.1:8001/routes/swap_quote_v1_route_optimism/plugins --data name=key-auth --data "config.key_in_query=false" --data "config.key_names=0x-api-key"
curl -i -X POST http://127.0.0.1:8001/routes/swap_quote_v1_route_fantom/plugins --data name=key-auth --data "config.key_in_query=false" --data "config.key_names=0x-api-key"
curl -i -X POST http://127.0.0.1:8001/routes/orderbook_v1_route_optimism/plugins --data name=key-auth --data "config.key_in_query=false" --data "config.key_names=0x-api-key"
curl -i -X POST http://127.0.0.1:8001/routes/orderbook_v1_route_fantom/plugins --data name=key-auth --data "config.key_in_query=false" --data "config.key_names=0x-api-key"

# enable ACL groups on routes
curl -i -X POST http://127.0.0.1:8001/routes/swap_price_v1_route_optimism/plugins --data name=acl --data "config.allow=swap_price_v1_group" --data "config.hide_groups_header=true"
curl -i -X POST http://127.0.0.1:8001/routes/swap_price_v1_route_fantom/plugins --data name=acl --data "config.allow=swap_price_v1_group" --data "config.hide_groups_header=true"
curl -i -X POST http://127.0.0.1:8001/routes/swap_quote_v1_route_optimism/plugins --data name=acl --data "config.allow=swap_quote_v1_group" --data "config.hide_groups_header=true"
curl -i -X POST http://127.0.0.1:8001/routes/swap_quote_v1_route_fantom/plugins --data name=acl --data "config.allow=swap_quote_v1_group" --data "config.hide_groups_header=true"
curl -i -X POST http://127.0.0.1:8001/routes/orderbook_v1_route_optimism/plugins --data name=acl --data "config.allow=orderbook_v1_group" --data "config.hide_groups_header=true"
curl -i -X POST http://127.0.0.1:8001/routes/orderbook_v1_route_fantom/plugins --data name=acl --data "config.allow=orderbook_v1_group" --data "config.hide_groups_header=true"

# enable anonymous for swap/v1/price
curl -i -X POST http://127.0.0.1:8001/consumers --data username=0x_anonymous
curl -i -X POST http://127.0.0.1:8001/consumers/0x_anonymous/acls --data "group=swap_price_v1_group"
curl -i -X POST http://127.0.0.1:8001/consumers/0x_anonymous/plugins --data name=rate-limiting --data "config.minute=1" --data "route.name=swap_price_v1_route_optimism" --data "config.limit_by=ip"
curl -i -X POST http://127.0.0.1:8001/consumers/0x_anonymous/plugins --data name=rate-limiting --data "config.minute=1" --data "route.name=swap_price_v1_route_fantom" --data "config.limit_by=ip"
