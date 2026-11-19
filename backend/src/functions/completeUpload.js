const { HeadObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { activatePendingShare, getShareById } = require('../repositories/shareRepository');
const { getAuthenticatedUserSub } = require('../utils/auth');

const s3Client = new S3Client({});

const response = (statusCode, body) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
});

exports.lambdaHandler = async (event) => {
    const shareId = event?.pathParameters?.shareId;
    const bucketName = process.env.UPLOAD_BUCKET;
    const ownerSub = getAuthenticatedUserSub(event);

    if (!shareId) {
        return response(400, { message: 'shareId is required', success: false });
    }

    if (!ownerSub) {
        return response(401, { message: 'Authentication is required', success: false });
    }

    if (!bucketName) {
        console.error('UPLOAD_BUCKET is not configured');
        return response(500, { message: 'Upload service is not configured', success: false });
    }

    const share = await getShareById(shareId);

    if (!share) {
        return response(404, { message: 'Share not found', success: false });
    }

    if (share.ownerSub !== ownerSub) {
        return response(403, { message: 'You do not own this share', success: false });
    }

    if (share.status !== 'PENDING') {
        return response(409, { message: 'Share upload is not pending', success: false });
    }

    let object;
    try {
        object = await s3Client.send(new HeadObjectCommand({
            Bucket: bucketName,
            Key: share.s3Key,
        }));
    } catch (error) {
        if (error?.name === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
            return response(404, { message: 'Uploaded file not found', success: false });
        }

        console.error('Unable to verify uploaded file', error);
        return response(500, { message: 'Unable to verify uploaded file', success: false });
    }

    // if (share.fileSize !== null && share.fileSize !== undefined && object.ContentLength !== share.fileSize) {
    //     return response(400, { message: 'Uploaded file size does not match', success: false });
    // }

    if (object.ContentType !== share.contentType) {
        return response(400, { message: 'Uploaded file content type does not match', success: false });
    }

    if (!Number.isInteger(share.expiryHours) || share.expiryHours <= 0) {
        console.error('Pending share is missing a valid expiryHours value');
        return response(500, { message: 'Share expiration is not configured', success: false });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + (share.expiryHours * 60 * 60);

    try {
        await activatePendingShare(shareId, expiresAt);
    } catch (error) {
        if (error?.name === 'ConditionalCheckFailedException') {
            return response(409, { message: 'Share upload is not pending', success: false });
        }

        console.error('Unable to activate share', error);
        return response(500, { message: 'Unable to activate share', success: false });
    }

    return response(200, {
        shareId,
        status: 'ACTIVE',
        expiresAt,
        shareUrl: `/s/${shareId}`,
        success: true,
    });
};
