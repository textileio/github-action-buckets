#!/bin/sh -l

echo "Updating Bucket $1 from $2"
time=$(date)
mkdir $HOME/.textile

echo "token: $3" > $HOME/.textile/auth.yml

echo "start"
echo $(ls ./)
echo "target"
echo $(ls /target)

$(mv /target/textile /textile)
$(chmod +x ./textile)

echo "after"
echo $(ls ./)

$(./textile bucket push $2 $1)

echo ::set-output name=cid::INCOMPLETE