#!/bin/sh

set -e

echo "Updating Bucket $1 from $2"
time=$(date)
mkdir -p $HOME/.textile

echo "token: $3" > $HOME/.textile/auth.yml

cd /home/repo

echo -ne '\n' | textile buckets push $2 $1
wait
echo ::set-output name=cid::INCOMPLETE