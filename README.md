# Push to IPFS, IPNS, Textile Buckets in CI

Use buckets to create, update or remove a directory on a remote IPFS node of the [Textile Hub](https://docs.textile.io/). 

Buckets provide you easy access to multiple protocols for sharing or moving data. When you create a Bucket on the Textile Hub, you will get an IPFS hash of the latest content, an IPNS address that will update with each change, and a unique subdomain to share your latest updates.

##### Example output

- **ipfs**: bafybeigu4cekqzl6fs57svia63p4v4yvp6oanrsuktgwy7sc742dcp4yrm
- **ipfs gateway link**: https://hub.textile.io/ipfs/bafybeigu4cekqzl6fs57svia63p4v4yvp6oanrsuktgwy7sc742dcp4yrm
- **ipns**: bafzbeicg4zuixstnoubuvb4nvqfcgj7iqu4dm6l3fwiwgnac6nsrnfgzjm
- **ipns link**: https://hub.textile.io/ipns/bafzbeicg4zuixstnoubuvb4nvqfcgj7iqu4dm6l3fwiwgnac6nsrnfgzjm
- **hub link**: https://hub.textile.io/thread/bafky45bowefya4lprbkvzzvmmjmqr56hu6qn6wpolbjil7p25goycwy/buckets/bafzbeicg4zuixstnoubuvb4nvqfcgj7iqu4dm6l3fwiwgnac6nsrnfgzjm
- **www link**: https://bafzbeicg4zuixstnoubuvb4nvqfcgj7iqu4dm6l3fwiwgnac6nsrnfgzjm.textile.space

## Usage

Add a step to your github actions.

```yml
name: "Textile Bucket - Deploy"
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
    name: push textile bucket
    steps:
    - name: push action
      id: push
      uses: textileio/github-action-bucket-push@latest
      with:
        key: ${{ secrets.TEXTILE_ACCOUNT_KEY }}
        secret: ${{ secrets.TEXTILE_ACCOUNT_SECRET }}
        bucket: '<BUCKET_NAME>'
        thread: '<THREAD_ID>'
        path: '<DIRECTORY_PATH>'
        pattern: '<FILE_PATTERN>'
        remove: '<REMOVE_BUCKET?>'
    # Use the output from the `hello` step
    - run: echo "bucket - ${{ steps.bucket.outputs.bucket }}"
    - run: echo "ipfs - ${{ steps.bucket.outputs.ipfs }}"
    - run: echo "ipfs link - ${{ steps.bucket.outputs.ipfsUrl }}"
    - run: echo "ipns - ${{ steps.bucket.outputs.ipns }}"
    - run: echo "ipns link - ${{ steps.bucket.outputs.ipnsUrl }}"
    - run: echo "hub - ${{ steps.bucket.outputs.hub }}"
    - run: echo "www - ${{ steps.bucket.outputs.www }}"
```

**Parameters**

- **key**: a textile hub account key for you or your organization ([docs](https://docs.textile.io/hub/app-apis/)).
- **secret**: a textile hub account key for you or your organization ([docs](https://docs.textile.io/hub/app-apis/)).
- **thread**: thread id for thread holding bucket. ([docs](https://docs.textile.io/hub/cli/tt_bucket_push/) see output of _bucket create_ or `cat .textile/config.yml`).
- **bucket**: remote bucket path name. ([docs](https://docs.textile.io/hub/cli/tt_bucket_push/) see _path_).
- **path**: (optional) the path within the repo that you want pushed to your bucket (default: '.').
- **pattern**: (optional) file search filter to limit which files you push to the remote bucket (default: '**/*').
- **remove**: (optional) set to 'true' if you wish to remove the bucket not update/create it. this cannot be undone.

You must use an existing ThreadID (_thread_) to push your Bucket. If you use an existing Bucket name (_bucket_) it will update that bucket, if you use a new name it will create a new bucket in the thread.

To create a Thread for your Bucket, first setup a bucket locally.

```bash
// create your account
tt init
// login
tt login
// go to your project rep
cd project
// init a bucket
// you will select a bucket name and thread. copy the thread id (and optionally the same name) to use as parameters here.
tt bucket init
```

You can also keep ThreadID private by supplying it from your SECRETs.

For more information on using Textile Buckets, see the [documentation](https://docs.textile.io/hub/buckets).
