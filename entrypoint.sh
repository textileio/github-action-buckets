#!/bin/sh

set -e

echo "Updating Bucket $1 from $2"
time=$(date)
mkdir -p $HOME/.textile

echo "token: $3" > $HOME/.textile/auth.yml

cd /home/repo

echo $(ls ./)

echo -ne '\n' | textile buckets push $2 $1
wait
HEAD=$(textile bucket ls $1 | grep ipfs | head -1)
wait
CID=$(echo $HEAD | sed -e 's/.*ipfs\/\(.*\)\/.*/\1/')
echo $CID
echo ::set-output name=cid::$CID