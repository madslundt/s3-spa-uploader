# S3 SPA Upload

Upload a Single Page Application (React, Angular, Vue, ...) to S3 with the right content-type and cache-control meta-data

![Build Status](https://codebuild.eu-west-1.amazonaws.com/badges?uuid=eyJlbmNyeXB0ZWREYXRhIjoiQit5K1dqTW4zc2xYbnhOK3pFNU01dEtmM3gzODk4dmZaMDkvVVUzcHJjMWZHMmpCT05yaVEzT3I3WDZ1L25lcTI4QXFhUnlRbngrZTBsNmpwbWdCOEJJPSIsIml2UGFyYW1ldGVyU3BlYyI6ImZoY2c2aVA0ZHBKV1FxS24iLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&branch=master)

## Installation

To install globally (recommended):

    npm install -g s3-spa-upload

## Usage

Basic usage:

    s3-spa-upload dist-dir my-s3-bucket-name

To also clean up old files, specify '--clean' as the last parameter. This will delete *all* files in the bucket that are not included in the current upload (**do** ensure you really want this):

    s3-spa-upload dist-dir my-s3-bucket-name --clean
