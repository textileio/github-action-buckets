#!/bin/sh

set -eux

echo "Updating Bucket $1 from $2"
time=$(date)
mkdir $HOME/.textile

echo "token: $3" > $HOME/.textile/auth.yml


echo $(textile --help)

echo $(textile bucket push $2 $1)



echo ::set-output name=cid::INCOMPLETE