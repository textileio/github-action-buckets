#!/bin/sh -l

echo "Updating Bucket $1 from $2"
time=$(date)
mkdir $HOME/.textile

echo "token: $3" > $HOME/.textile/auth.yml

echo "after"
ls /target

/target/textile --help

/target/textile bucket push $2 $1



echo ::set-output name=cid::INCOMPLETE