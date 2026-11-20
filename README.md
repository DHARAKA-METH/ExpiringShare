# ExpiringShare

ExpiringShare is a serverless file-sharing application. Users sign in with Amazon Cognito, upload files directly to Amazon S3 using short-lived presigned URLs, and create share links that automatically expire or stop after a download limit.

The application keeps file metadata in DynamoDB and keeps file contents in S3. Files do not pass through Lambda.

## Features

- File upload
- Secure share URL generation
- Download count limits
- Link expiration time
- Owner file dashboard
- Automatic expired-file cleanup

## Architecture
<img width="4099" height="4626" alt="aws architecture expire share" src="https://github.com/user-attachments/assets/59cbcdb0-a28a-4e4f-9808-2d32b19314d2" />


## Technology stack

### Frontend

- Next.js
- Tailwind CSS

### Backend

- AWS Lambda
- Node.js 22
- JavaScript
- Amazon API Gateway REST API
- AWS SAM and CloudFormation

### AWS services

- Amazon Cognito User Pool
- Amazon S3
- Amazon DynamoDB
- Amazon EventBridge Scheduler
- Amazon CloudWatch

## Lambda functions

| Function | Endpoint or trigger | Responsibility |
|---|---|---|
| `CreateUploadUrlFunction` | `POST /uploads` | Validates the request, saves a `PENDING` share, and creates a presigned S3 upload URL |
| `CompleteUploadFunction` | `POST /uploads/{shareId}/complete` | Verifies ownership and the S3 object, then changes the share to `ACTIVE` |
| `DownloadShareFunction` | `POST /shares/{shareId}/download` | Validates expiration/download limits and creates a presigned S3 download URL |
| `ListMySharesFunction` | `GET /shares/mine` | Queries the `OwnerIndex` and returns the logged-in user’s shares |
| `HelloWorldFunction` | `GET /hello` | Public health/test endpoint |
| `CleanupExpiredFilesFunction` | EventBridge, hourly | Deletes expired S3 objects and DynamoDB metadata |

## Project structure

```text
ExpiringShare/
├── backend/
│   ├── src/functions/
│   │   ├── createUploadUrl.js
│   │   ├── completeUpload.js
│   │   ├── downloadShare.js
│   │   ├── listMyShares.js
│   │   ├── cleanupExpiredFiles.js
│   │   └── helloWorld.js
│   ├── src/repositories/shareRepository.js
│   ├── src/utils/auth.js
│   ├── template.yaml
│   ├── samconfig.toml
│   └── s3-cors.json
├── frontend/
│   ├── src/app/
│   │   ├── login/
│   │   ├── signup/
│   │   ├── confirm/
│   │   ├── dashboard/
│   │   ├── upload/
│   │   └── s/[shareId]/
│   ├── src/components/
│   ├── src/lib/
│   ├── postcss.config.mjs
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js 22+
- AWS SAM CLI
- AWS CLI
- Docker, for local SAM execution
- An AWS account with configured credentials
- A Cognito User Pool and public app client with no client secret
- An existing S3 upload bucket
- An existing DynamoDB table named `ExpiringShareLinks`

The DynamoDB table needs these indexes:

```text
CleanupIndex: cleanupStatus + cleanupAt
OwnerIndex: ownerSub + createdAt
```

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local
```

Set the values in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://dye7y3ua12.execute-api.ap-south-1.amazonaws.com/Prod
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-south-1_YOUR_POOL_ID
NEXT_PUBLIC_COGNITO_CLIENT_ID=YOUR_PUBLIC_APP_CLIENT_ID
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## S3 CORS setup

The application bucket must allow browser uploads from the frontend origin:

```bash
aws s3api put-bucket-cors \
  --bucket YOUR_UPLOAD_BUCKET \
  --cors-configuration file://backend/s3-cors.json \
  --region ap-south-1
```

## Backend build and deployment

```bash
cd backend
sam validate --lint
sam build
```

Deploy with the Cognito User Pool ARN:

```bash
sam deploy --no-confirm-changeset \
  --parameter-overrides \
  CognitoUserPoolArn="arn:aws:cognito-idp:ap-south-1:ACCOUNT_ID:userpool/POOL_ID" \
  FrontendOrigin="http://localhost:3000" \
  OwnerIndexName="OwnerIndex"
```

## Testing

Backend tests:

```bash
cd backend
npm test
```

Frontend production build:

```bash
cd frontend
npm run build
```


## License

This project is for educational and development use. Add a project license before distributing it publicly.
