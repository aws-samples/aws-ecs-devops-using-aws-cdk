#!/bin/sh

echo --TARGET-URL--
export URL_ALB=http://$AlbDnsName/items
export URL_NAMESPACE=http://$TargetServiceName.$Namespace/items
echo $URL

echo --RESPONSE-TEST--
curl $URL_ALB

function ab_function {
    ab -n 50 -c 2 $URL_ALB
    ab -n 50 -c 2 $URL_NAMESPACE

}

echo --START-LOAD-TEST--
while true; do ab_function; sleep 5; done
# while true; do ab -n 50 -c 2 $URL; sleep 5; done
