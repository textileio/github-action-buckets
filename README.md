# github-action-bucket-push

Use buckets to push a directory to a remote IPFS node on the Textile Hub

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
    # Use the output from the `hello` step
    - name: http link
      run: echo "bucket now live at ${{ steps.bucket.outputs.http }}"
    - name: ipns
      run: echo "IPNS ${{ steps.bucket.outputs.ipns }}"
    - name: ipns link
      run: echo "IPNS link ${{ steps.bucket.outputs.ipnsLink }}"
    - name: ipfs
      run: echo "IPFS ${{ steps.bucket.outputs.ipfs }}"
    - name: ipfs link
      run: echo "IPFS link ${{ steps.bucket.outputs.ipfsLink }}"
```

**Parameters**

- **key**: a textile hub account key for you or your organization ([docs](https://docs.textile.io/hub/app-apis/)).
- **secret**: a textile hub account key for you or your organization ([docs](https://docs.textile.io/hub/app-apis/)).
- **thread**: thread id for thread holding bucket. ([docs](https://docs.textile.io/hub/cli/tt_bucket_push/) see output of _bucket create_ or `cat .textile/config.yml`).
- **bucket**: remote bucket path name. ([docs](https://docs.textile.io/hub/cli/tt_bucket_push/) see _path_).
- **path**: (optional) the path within the repo that you want pushed to your bucket (default: '.').
- **pattern**: (optional) file search filter to limit which files you push to the remote bucket (default: '**/*').

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

For more information on using Textile Buckets, see the [documentation](https://docs.textile.io/hub/buckets).
