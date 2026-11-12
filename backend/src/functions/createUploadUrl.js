const crypto = require('node:crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { S3Client } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({});
const URL_EXPIRATION_SECONDS = 300;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'application/pdf',
    'text/plain',
]);

const response = (statusCode, body) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
});

const parseBody = (event) => {
    if (!event || !event.body) {
        return null;
    }

    try {
        const body = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString('utf8')
            : event.body;
        return typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
        return null;
    }
};

exports.lambdaHandler = async (event) => {
    const request = parseBody(event);
    const fileName = typeof request?.fileName === 'string' ? request.fileName.trim() : '';
    const contentType = typeof request?.contentType === 'string' ? request.contentType.trim() : '';
    const fileSize = request?.fileSize;

    if (!fileName || !contentType) {
        return response(400, {
            message: 'fileName and contentType are required',
            success: false,
        });
    }

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
        return response(400, {
            message: 'Unsupported contentType',
            success: false,
        });
    }

    if (fileSize !== undefined && (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE_BYTES)) {
        return response(400, {
            message: 'fileSize must be a positive integer no larger than 10 MB',
            success: false,
        });
    }

    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const objectKey = `uploads/${crypto.randomUUID()}-${safeFileName}`;
    const bucketName = process.env.UPLOAD_BUCKET;

    if (!bucketName) {
        console.error('UPLOAD_BUCKET is not configured');
        return response(500, {
            message: 'Upload service is not configured',
            success: false,
        });
    }

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: URL_EXPIRATION_SECONDS,
    });

    return response(200, {
        uploadUrl,
        objectKey,
        expiresIn: URL_EXPIRATION_SECONDS,
        success: true,
    });
};
