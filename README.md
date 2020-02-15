# github-action-bucket-push

Push a folder to your Textile Bucket.

## Usage

Add a step to your github actions.

```yml
name: bucket_push
on:
  push:
    branches:
      - master
  pull_request:
    branches:
      - master

jobs:
  bucket_push:
    runs-on: ubuntu-latest
    name: Update a Textile bucket
    steps:
    - name: Bucket push action
      id: push
      uses: textileio/github-action-bucket-push@v3
      with:
        bucket-name: 'bucket-push-action'
        path: '*'
        token: ${{ secrets.TEXTILE_AUTH_TOKEN }}
    # Use the output from the `hello` step
    - name: Get the output CID
      run: echo "The CID was ${{ steps.push.outputs.cid }}"
```

For more information on using this Action or creating your Textile auth token, read [our blog post here](https://blog.textile.io/ethden-2-pin-projects-to-ipfs-right-from-github/).
