const { getAuthenticatedUserSub } = require('../utils/auth');
const { listSharesByOwner } = require('../repositories/shareRepository');

const response = (statusCode, body) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.FRONTEND_ORIGIN || '*',
    },
    body: JSON.stringify(body),
});

exports.lambdaHandler = async (event) => {
    const ownerSub = getAuthenticatedUserSub(event);

    if (!ownerSub) {
        return response(401, {
            message: 'Authentication is required',
            success: false,
        });
    }

    try {
        const shares = await listSharesByOwner(ownerSub);

        return response(200, {
            shares: shares.map((share) => ({
                shareId: share.shareId,
                fileName: share.fileName,
                contentType: share.contentType,
                fileSize: share.fileSize,
                status: share.status,
                createdAt: share.createdAt,
                expiresAt: share.expiresAt,
                maxDownloads: share.maxDownloads ?? null,
                downloadCount: share.downloadCount ?? 0,
                shareUrl: `/s/${share.shareId}`,
            })),
            success: true,
        });
    } catch (error) {
        console.error('Unable to list shares', error);
        return response(500, {
            message: 'Unable to list shares',
            success: false,
        });
    }
};
