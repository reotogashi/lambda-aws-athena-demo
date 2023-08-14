# lambda-aws-athena-demo

- This is a sample SAM application to query by Athena.
- Initial code is prepared by `sam init`.

## 0. Prerequisite

```
$ sam --version
SAM CLI, version 1.69.0
```

```
$ node -v
v18.17.0
```

```
$ npm -v
9.6.7
```

- Database and table are already created in Athena

## 1. How to run sam locally

- Run `npm install`
- Add Environment Variables in `template.yaml`
- Run `npm run sam-local`

## 2. How to deploy the SAM application to AWS

- Run `npm run sam-deploy`
  - If you cannot create a S3 bucket speciifed in `samconfig.toml` because the bucket already exists, please create a different S3 bucket and specify in the toml file

## Reference
- https://dev.classmethod.jp/articles/amazon-athena-pagination-typescript/
