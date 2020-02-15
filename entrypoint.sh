#!/bin/sh

set -e

echo "Updating Bucket $1 from $2"
time=$(date)
mkdir -p $HOME/.textile

echo "token: $3" > $HOME/.textile/auth.yml

# wget https://github.com/textileio/textile/releases/download/v0.0.2/textile_v0.0.2_linux-amd64.tar.gz
# tar -xvf textile_v0.0.2_linux-amd64.tar.gz
# sudo chmod +x /usr/local/bin/textile
cd home/repo
echo $(ls ./)
echo "textile bucket push $1 $2"
echo $(textile bucket push $1 $2)
echo ::set-output name=cid::INCOMPLETE