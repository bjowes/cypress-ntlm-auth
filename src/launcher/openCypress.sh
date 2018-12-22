#!/bin/sh

PROXY_URL=`node ~/NodeProjects/cypress-ntlm-auth/src/launcher/getProxyUrl.js`

HTTP_PROXY=$PROXY_URL $(npm bin)/cypress open