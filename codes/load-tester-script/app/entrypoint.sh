#!/bin/sh

echo --TARGET-URL--
export URL=http://$TargetServiceName.$Namespace/items
# export URL=http://internal-EcsPr-EcsAl-13DKRETAW4NRK-1005565471.us-east-2.elb.amazonaws.com/items
echo $URL

echo --RESPONSE-TEST--
curl $URL

echo --START-LOAD-TEST--
while true; do ab -n 50 -c 2 $URL; sleep 5; done
