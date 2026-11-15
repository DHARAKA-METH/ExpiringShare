const { HeadObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { activatePendingShare, getShareById } = require('../repositories/shareRepository');

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

    if (!shareId) {
        return response(400, { message: 'shareId is required', success: false });
    }

    if (!bucketName) {
        console.error('UPLOAD_BUCKET is not configured');
        return response(500, { message: 'Upload service is not configured', success: false });
    }

    const share = await getShareById(shareId);

    if (!share) {
        return response(404, { message: 'Share not found', success: false });
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

    try {
        await activatePendingShare(shareId);
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
        shareUrl: `/s/${shareId}`,
        success: true,
    });
};
