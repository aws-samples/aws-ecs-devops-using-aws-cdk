#!/bin/sh

echo --TARGET-URL--
export URL_ALB=http://$AlbDnsName/items
export URL_NAMESPACE=http://$TargetServiceName.$Namespace/items
echo "URL_ALB>> $URL_ALB"
echo "URL_NAMESPACE>> $URL_NAMESPACE"


function ab_function {
    echo --ALB-RESPONSE-TEST--
    curl -X GET $URL_ALB
    ab -n 50 -c 2 $URL_ALB

    echo --NS-RESPONSE-TEST--
    curl -X GET $URL_NAMESPACE
    ab -n 50 -c 2 $URL_NAMESPACE

}

echo --START-LOAD-TEST--
while true; do ab_function; sleep 10; done
