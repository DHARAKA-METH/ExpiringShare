const { DeleteObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { deleteShare, findExpiredShares } = require('../repositories/shareRepository');

const s3Client = new S3Client({});

exports.lambdaHandler = async () => {
    const bucketName = process.env.UPLOAD_BUCKET;
    const now = Math.floor(Date.now() / 1000);

    if (!bucketName) {
        throw new Error('UPLOAD_BUCKET environment variable is not configured');
    }

    const shares = await findExpiredShares(now);
    const summary = { found: shares.length, deleted: 0, failed: 0 };

    for (const share of shares) {
        try {
            if (!share.s3Key) {
                throw new Error(`Share ${share.shareId} has no s3Key`);
            }

            await s3Client.send(new DeleteObjectCommand({
                Bucket: bucketName,
                Key: share.s3Key,
            }));

            await deleteShare(share.shareId);
            summary.deleted += 1;
        } catch (error) {
            summary.failed += 1;
            console.error('Unable to clean up share', {
                shareId: share.shareId,
                errorName: error?.name,
            });
        }
    }

    return summary;
};
