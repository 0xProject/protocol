
INTEGRATOR_ID=cle7j5fu4000j07mh7miz5f2i
PROJECT_ID=cle7j1k1q000g07mhc9ti587w
REDIS_HOST=master.prod-ratelimiting-main.k8olw0.use1.cache.amazonaws.com
ROUTE_NAME=optimism-api.api-prod-optimism-ingress-mike.api-swap-prod-optimism.optimism.api.0x.org.80
ACL_GROUP_NAME=swap_v1_group
API_KEY=dcfc00e4-7d30-4d90-81da-ad4f8853eb61
RATE_LIMIT_ERROR_MSG="rate limit exceeded - see https://www.0x.org/rate-limit for more details."

# add ACL to route
curl -i -X POST http://127.0.0.1:8901/routes/$ROUTE_NAME/plugins --data name=acl --data "config.allow=$ACL_GROUP_NAME" --data "config.hide_groups_header=true"
# curl -i -X DELETE http://127.0.0.1:8901/routes/$ROUTE_NAME/plugins/xxxxxxx

# enable key-auth for route
curl -i -X POST http://127.0.0.1:8901/routes/$ROUTE_NAME/plugins --data name=key-auth --data "config.key_in_query=false" --data "config.key_names=0x-api-key" --data "config.anonymous=0x_anonymous"

# configure public access and rate-limit
curl -i -X POST http://127.0.0.1:8901/consumers --data username=0x_anonymous
curl -i -X POST http://127.0.0.1:8901/consumers/0x_anonymous/acls --data "group=$ACL_GROUP_NAME"
curl -i -X POST http://127.0.0.1:8901/consumers/0x_anonymous/plugins --data name=rate-limiting --data "config.minute=1" --data "route.name=$ROUTE_NAME" --data "config.limit_by=ip" --data "config.error_message=public $RATE_LIMIT_ERROR_MSG" --data "config.redis_host=$REDIS_HOST" --data "config.policy=redis" --data "config.redis_timeout=1000" --data "config.redis_ssl=true"



#### PER CONSUMER PROVISIONING ####

# create consumer
curl -i -X PUT http://127.0.0.1:8901/consumers/$PROJECT_ID
# setup header transforms for consumer
curl -i -X POST http://127.0.0.1:8901/consumers/$PROJECT_ID/plugins --data name=request-transformer --data "config.rename.headers=X-Consumer-Username:0x-Project-Id" --data "config.add.headers=0x-Integrator-Id:$INTEGRATOR_ID"

# assign API key(s) to consumer
curl -i -X POST http://127.0.0.1:8901/consumers/$PROJECT_ID/key-auth --data key=$API_KEY

# enable route access to consumer
curl -i -X POST http://127.0.0.1:8901/consumers/$PROJECT_ID/acls --data "group=$ACL_GROUP_NAME"
# assign rate limit for route for consumer
curl -i -X POST http://127.0.0.1:8901/consumers/$PROJECT_ID/plugins --data name=rate-limiting --data "config.minute=5" --data "route.name=$ROUTE_NAME" --data "config.error_message=$RATE_LIMIT_ERROR_MSG" --data "config.redis_host=$REDIS_HOST" --data "config.policy=redis" --data "config.redis_timeout=1000" --data "config.redis_ssl=true"



## TEST REQUESTS ##

# no key (public rate limit)
 curl -i -X GET "https://optimism.api.0x.org/mike/swap/v1/quote?buyToken=DAI&sellToken=WETH&sellAmount=100000000000000000"

 # bad key (treated as public rate limit)
 curl -i -X GET -H "0x-Api-Key:badkey" "https://optimism.api.0x.org/mike/swap/v1/quote?buyToken=DAI&sellToken=WETH&sellAmount=100000000000000000"

 # proper key
 curl -i -X GET -H "0x-Api-Key:$API_KEY" "https://optimism.api.0x.org/mike/swap/v1/quote?buyToken=DAI&sellToken=WETH&sellAmount=100000000000000000"




