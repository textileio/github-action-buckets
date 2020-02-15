#!/bin/sh -l

echo "Updating Bucket $1 from $2"
time=$(date)
mkdir $HOME/.textile

echo "token: $3" > $HOME/.textile/auth.yml

# wget "https://github.com/textileio/textile/releases/download/v0.0.2/textile_v0.0.2_linux-amd64.tar.gz"
# tar -xvf textile_v0.0.2_linux-amd64.tar.gz
# chmod +x textile
# mv textile /bin/

echo $(ls /target)

echo $(textile bucket push $2 $1)

echo ::set-output name=cid::INCOMPLETE