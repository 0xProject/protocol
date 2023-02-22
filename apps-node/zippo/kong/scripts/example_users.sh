
# alice
curl -i -X PUT http://127.0.0.1:8001/consumers/alice-p1
curl -i -X POST http://127.0.0.1:8001/consumers/alice-p1/key-auth  --data key=alice-k1
curl -i -X POST http://127.0.0.1:8001/consumers/alice-p1/key-auth  --data key=alice-k2
curl -i -X POST http://127.0.0.1:8001/consumers/alice-p1/acls --data "group=swap_price_v1_group"
curl -i -X POST http://127.0.0.1:8001/consumers/alice-p1/plugins --data name=rate-limiting --data "config.minute=5" --data "route.name=swap_price_v1_route" --data "config.error_message=Rate limit exceeded - see https://www.0x.org/rate-limit for more details."
curl -i -X POST http://127.0.0.1:8001/consumers/alice-p1/acls --data "group=swap_quote_v1_group"
curl -i -X POST http://127.0.0.1:8001/consumers/alice-p1/plugins --data name=rate-limiting --data "config.minute=1" --data "route.name=swap_quote_v1_route" --data "config.error_message=Rate limit exceeded - see https://www.0x.org/rate-limit for more details."
curl -i -X POST http://127.0.0.1:8001/consumers/alice-p1/plugins --data name=request-transformer --data "config.rename.headers=X-Consumer-Username:0x-Project-Id" --data "config.add.headers=0x-Integrator-Id:alice"

# bob project 1 - swap
curl -i -X PUT http://127.0.0.1:8001/consumers/bob-p1
curl -i -X POST http://127.0.0.1:8001/consumers/bob-p1/key-auth --data key=bob-k1
curl -i -X POST http://127.0.0.1:8001/consumers/bob-p1/acls --data "group=swap_price_v1_group"
curl -i -X POST http://127.0.0.1:8001/consumers/bob-p1/plugins --data name=rate-limiting --data "config.minute=2" --data "route.name=swap_price_v1_route" --data "config.error_message=Rate limit exceeded - see https://www.0x.org/rate-limit for more details."
curl -i -X POST http://127.0.0.1:8001/consumers/bob-p1/acls --data "group=swap_quote_v1_group"
curl -i -X POST http://127.0.0.1:8001/consumers/bob-p1/plugins --data name=rate-limiting --data "config.minute=1" --data "route.name=swap_quote_v1_route" --data "config.error_message=Rate limit exceeded - see https://www.0x.org/rate-limit for more details."
curl -i -X POST http://127.0.0.1:8001/consumers/bob-p1/plugins --data name=request-transformer --data "config.rename.headers=X-Consumer-Username:0x-Project-Id" --data "config.add.headers=0x-Integrator-Id:bob"
# bob project 2 - orderbook
curl -i -X PUT http://127.0.0.1:8001/consumers/bob-p2
curl -i -X POST http://127.0.0.1:8001/consumers/bob-p2/key-auth --data key=bob-k2
curl -i -X POST http://127.0.0.1:8001/consumers/bob-p2/acls --data "group=orderbook_v1_group"
curl -i -X POST http://127.0.0.1:8001/consumers/bob-p2/plugins --data name=rate-limiting --data "config.minute=2" --data "route.name=orderbook_v1_route" --data "config.error_message=Rate limit exceeded - see https://www.0x.org/rate-limit for more details."
curl -i -X POST http://127.0.0.1:8001/consumers/bob-p2/plugins --data name=request-transformer --data "config.rename.headers=X-Consumer-Username:0x-Project-Id" --data "config.add.headers=0x-Integrator-Id:bob"

# charlie
curl -i -X PUT http://127.0.0.1:8001/consumers/charlie-p1
curl -i -X POST http://127.0.0.1:8001/consumers/charlie-p1/key-auth --data key=charlie-k1
curl -i -X POST http://127.0.0.1:8001/consumers/charlie-p1/acls --data "group=orderbook_v1_group"
curl -i -X POST http://127.0.0.1:8001/consumers/charlie-p1/plugins --data name=rate-limiting --data "config.minute=5" --data "route.name=orderbook_v1_route" --data "config.error_message=Rate limit exceeded - see https://www.0x.org/rate-limit for more details."
curl -i -X POST http://127.0.0.1:8001/consumers/charlie-p1/plugins --data name=request-transformer --data "config.rename.headers=X-Consumer-Username:0x-Project-Id" --data "config.add.headers=0x-Integrator-Id:charlie"
