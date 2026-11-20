const { GetObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { authorizeDownload, getShareById } = require('../repositories/shareRepository');

const s3Client = new S3Client({});
const DOWNLOAD_URL_EXPIRATION_SECONDS = 60;

const response = (statusCode, body) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.FRONTEND_ORIGIN || '*',
    },
    body: JSON.stringify(body),
});

exports.lambdaHandler = async (event) => {
    const shareId = event?.pathParameters?.shareId;
    const bucketName = process.env.UPLOAD_BUCKET;

    if (!shareId) {
        return response(400, { message: 'shareId is required', success: false });
    }

    if (!bucketName) {
        console.error('UPLOAD_BUCKET is not configured');
        return response(500, { message: 'Download service is not configured', success: false });
    }

    let share;
    try {
        share = await getShareById(shareId);
    } catch (error) {
        console.error('Unable to retrieve share', error);
        return response(500, { message: 'Unable to retrieve share', success: false });
    }

    if (!share) {
        return response(404, { message: 'Share not found', success: false });
    }

    if (share.status !== 'ACTIVE') {
        return response(403, { message: 'Share is not active', success: false });
    }

    const now = Math.floor(Date.now() / 1000);
    if (!Number.isInteger(share.expiresAt) || share.expiresAt <= 0) {
        console.error('Active share is missing a valid expiresAt timestamp');
        return response(500, { message: 'Share expiration is not configured', success: false });
    }
    if (now >= share.expiresAt) {
        return response(410, { message: 'This sharing link has expired', success: false });
    }

    if (!share.s3Key || !share.fileName) {
        console.error('Share metadata is missing its S3 key or file name');
        return response(500, { message: 'Share metadata is incomplete', success: false });
    }

    try {
        await authorizeDownload(shareId, now, share.maxDownloads ?? null);
    } catch (error) {
        if (error?.name === 'ConditionalCheckFailedException') {
            return response(403, { message: 'Download limit reached or share is no longer available', success: false });
        }

        console.error('Unable to authorize download', error);
        return response(500, { message: 'Unable to authorize download', success: false });
    }

    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: share.s3Key,
            ResponseContentDisposition: `attachment; filename="${share.fileName.replace(/["\\\r\n]/g, '_')}"`,
            ResponseContentType: share.contentType,
        });
        const downloadUrl = await getSignedUrl(s3Client, command, {
            expiresIn: DOWNLOAD_URL_EXPIRATION_SECONDS,
        });

        return response(200, {
            downloadUrl,
            fileName: share.fileName,
            expiresIn: DOWNLOAD_URL_EXPIRATION_SECONDS,
            success: true,
        });
    } catch (error) {
        console.error('Unable to create download URL', error);
        return response(500, { message: 'Unable to create download URL', success: false });
    }
};
