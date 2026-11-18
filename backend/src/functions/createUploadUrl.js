const crypto = require('node:crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { S3Client } = require('@aws-sdk/client-s3');
const { createShare } = require('../repositories/shareRepository');

const s3Client = new S3Client({});
const URL_EXPIRATION_SECONDS = 300;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_EXPIRY_HOURS = 24;
const ALLOWED_EXPIRY_HOURS = new Set([1, 24, 168]);
const ALLOWED_MAX_DOWNLOADS = new Set([1, 2, 3, 5]);
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
    const expiryHours = request?.expiryHours ?? DEFAULT_EXPIRY_HOURS;
    const maxDownloads = request?.maxDownloads ?? null;

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

    if (!Number.isInteger(expiryHours) || !ALLOWED_EXPIRY_HOURS.has(expiryHours)) {
        return response(400, {
            message: 'expiryHours must be one of: 1, 24, or 168',
            success: false,
        });
    }

    if (maxDownloads !== null && (!Number.isInteger(maxDownloads) || !ALLOWED_MAX_DOWNLOADS.has(maxDownloads))) {
        return response(400, {
            message: 'maxDownloads must be 1, 2, 3, 5, or null for unlimited downloads',
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
    const shareId = crypto.randomUUID();
    const objectKey = `uploads/${shareId}/${safeFileName}`;
    const bucketName = process.env.UPLOAD_BUCKET;

    if (!bucketName) {
        console.error('UPLOAD_BUCKET is not configured');
        return response(500, {
            message: 'Upload service is not configured',
            success: false,
        });
    }

    await createShare({
        shareId,
        s3Key: objectKey,
        fileName,
        contentType,
        fileSize: fileSize ?? null,
        status: 'PENDING',
        expiryHours,
        downloadCount: 0,
        maxDownloads,
        createdAt: Math.floor(Date.now() / 1000),
        expiresAt: null,
    });

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: URL_EXPIRATION_SECONDS,
    });

    return response(200, {
        shareId,
        uploadUrl,
        s3Key: objectKey,
        expiryHours,
        maxDownloads,
        expiresIn: URL_EXPIRATION_SECONDS,
        success: true,
    });
};
