# S3 SPA Uploader

Fork of [s3-spa-upload](https://github.com/ottokruse/s3-spa-upload)


Upload a Single Page Application (React, Angular, Vue, ...) to S3 with the right content-type and cache-control meta-data

This requires the following AWS S3 permissions (see sample CloudFormation policy template below):

- s3:PutObject on objects in your bucket
- s3:ListBucket on your bucket (only needed when using --delete option)
- s3:DeleteObject on objects in your bucket (only needed when using --delete option)

## Installation

To install globally:

    npm install -g s3-spa-uploader

To install locally

    npm install --save-dev s3-spa-uploader

## Command Line Usage

Basic usage:

    s3-spa-uploader dist-dir my-s3-bucket-name

## The differences between s3-spa-uploader and s3-spa-upload:
 - Works with Windows file paths
 - Add MIME-type mapping

### Clean-up old files

To also clean up old files, use the --delete option. This will delete all files in the bucket that are not included in the current upload (limited to the supplied prefix, see below):

    s3-spa-uploader dist-dir my-s3-bucket-name --delete

### Custom cache-control mapping

You can provide your desired cache-control mapping in a json file that contains a mapping from glob patterns to cache-control headers:

```javascript
{
    "index.html": "no-cache",
    "*.js": "public,max-age=31536000,immutable"
}
```

Suppose your mapping file is called `cache-control.json`:

    s3-spa-uploader dist-dir my-s3-bucket-name --cache-control-mapping cache-control.json

If you don't provide a custom mapping, the default will be used, which should be okay for most SPA's, see below.

### Upload to a prefix

By default the SPA will be uploaded to the root of your S3 bucket. If you don't want this, specify the prefix to use:

    s3-spa-uploader dist-dir my-s3-bucket-name --prefix mobile

Note that when used in conjunction with `--delete`, this means only old files matching that same prefix will be deleted.

## Programmatic Usage

```typescript
import s3SpaUploader from 's3-spa-uploader';
// const s3SpaUploader = require('s3-spa-uploader')

s3SpaUploader('dir', 'bucket').catch(console.error);

// Can supply options:
const options = {
    delete: true,
    verbose: true,
    prefix: 'mobile',
    cacheControlMapping: {
        'index.html': 'no-cache',
        '*.js': 'public,max-age=31536000,immutable',
    },
    awsCredentials: {
        accessKeyId: '...'
        secretAccessKey: '...'
        sessionToken: '...'
    },
    mimeTypeMapping: {
        ".html": "text/html",
        ".json": "application/json"
    }
}
s3SpaUploader('dir', 'bucket', options).catch(console.error);
```

## Default Cache-Control settings

File/ext | Cache setting | Description
---------|---------------|----------
`index.html`|`no-cache`|
`css`|`public,max-age=31536000,immutable`|As long as possible
`js`|`public,max-age=31536000,immutable`|As long as possible
`png`|`public,max-age=86400`|One day
`ico`|`public,max-age=86400`|One day
`txt`|`public,max-age=86400`|One day

## Content-Type settings

Based on file extensions using https://www.npmjs.com/package/mime-types

You can also provide custom mime types (these have higher prioerty than the mime-types extension)
```javascript
{
    ".html": "text/html",
    ".json": "application/json"
}
```

## AWS Policy Template

This CloudFormation IAM Policy template grants the needed permissions:

```yaml
- Version: "2012-10-17"
    Statement:
      - Effect: Allow # This effect is only needed when using the --delete option
          Action: s3:ListBucket
          Resource: arn:aws:s3:::your-bucket-name
      - Effect: Allow
          Action:
            - s3:DeleteObject # This action is only needed when using the --delete option
            - s3:PutObject
          Resource: arn:aws:s3:::your-bucket-name/*
```
