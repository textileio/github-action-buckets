#!/bin/sh -l

echo "Updating Bucket $1 from $2"
time=$(date)
mkdir $HOME/.textile

echo "token: $3" > $HOME/.textile/auth.yml

echo "after"
echo $(textile --help)

$(./textile bucket push $2 $1)

echo ::set-output name=cid::INCOMPLETE