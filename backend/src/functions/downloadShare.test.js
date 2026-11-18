jest.mock('@aws-sdk/client-s3', () => ({
    GetObjectCommand: jest.fn((input) => ({ input })),
    S3Client: jest.fn(() => ({})),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn(),
}));

jest.mock('../repositories/shareRepository', () => ({
    getShareById: jest.fn(),
    authorizeDownload: jest.fn(),
}));

const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { authorizeDownload, getShareById } = require('../repositories/shareRepository');
const { lambdaHandler } = require('./downloadShare');

describe('downloadShare Lambda', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.UPLOAD_BUCKET = 'test-upload-bucket';
        authorizeDownload.mockResolvedValue({ downloadCount: 1 });
        jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('returns a presigned download URL for an active share', async () => {
        getShareById.mockResolvedValue({
            shareId: 'share-001',
            s3Key: 'uploads/share-001/document.pdf',
            fileName: 'document.pdf',
            contentType: 'application/pdf',
            status: 'ACTIVE',
            expiresAt: 1_800_000_100,
            maxDownloads: 3,
        });
        getSignedUrl.mockResolvedValue('https://example.com/download');

        const result = await lambdaHandler({ pathParameters: { shareId: 'share-001' } });

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual({
            downloadUrl: 'https://example.com/download',
            fileName: 'document.pdf',
            expiresIn: 60,
            success: true,
        });
        expect(GetObjectCommand).toHaveBeenCalledWith({
            Bucket: 'test-upload-bucket',
            Key: 'uploads/share-001/document.pdf',
            ResponseContentDisposition: 'attachment; filename="document.pdf"',
            ResponseContentType: 'application/pdf',
        });
        expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 60 });
        expect(authorizeDownload).toHaveBeenCalledWith('share-001', 1_800_000_000, 3);
    });

    test('returns 404 for an unknown share', async () => {
        getShareById.mockResolvedValue(null);

        const result = await lambdaHandler({ pathParameters: { shareId: 'missing' } });

        expect(result.statusCode).toBe(404);
        expect(getSignedUrl).not.toHaveBeenCalled();
        expect(authorizeDownload).not.toHaveBeenCalled();
    });

    test('rejects a share that is not active', async () => {
        getShareById.mockResolvedValue({ shareId: 'share-001', status: 'PENDING' });

        const result = await lambdaHandler({ pathParameters: { shareId: 'share-001' } });

        expect(result.statusCode).toBe(403);
        expect(getSignedUrl).not.toHaveBeenCalled();
        expect(authorizeDownload).not.toHaveBeenCalled();
    });

    test('returns 400 when shareId is missing', async () => {
        const result = await lambdaHandler({ pathParameters: {} });

        expect(result.statusCode).toBe(400);
        expect(getShareById).not.toHaveBeenCalled();
    });

    test('rejects an expired active share without signing a URL', async () => {
        getShareById.mockResolvedValue({
            shareId: 'share-001',
            status: 'ACTIVE',
            expiresAt: 1_799_999_999,
        });

        const result = await lambdaHandler({ pathParameters: { shareId: 'share-001' } });

        expect(result.statusCode).toBe(410);
        expect(JSON.parse(result.body).message).toBe('This sharing link has expired');
        expect(getSignedUrl).not.toHaveBeenCalled();
        expect(authorizeDownload).not.toHaveBeenCalled();
    });

    test('rejects when the atomic download authorization reaches the limit', async () => {
        getShareById.mockResolvedValue({
            shareId: 'share-001',
            s3Key: 'uploads/share-001/document.pdf',
            fileName: 'document.pdf',
            contentType: 'application/pdf',
            status: 'ACTIVE',
            expiresAt: 1_800_000_100,
            maxDownloads: 1,
        });
        authorizeDownload.mockRejectedValue({ name: 'ConditionalCheckFailedException' });

        const result = await lambdaHandler({ pathParameters: { shareId: 'share-001' } });

        expect(result.statusCode).toBe(403);
        expect(getSignedUrl).not.toHaveBeenCalled();
    });

    test('authorizes unlimited shares without a maximum count condition', async () => {
        getShareById.mockResolvedValue({
            shareId: 'share-001',
            s3Key: 'uploads/share-001/document.pdf',
            fileName: 'document.pdf',
            contentType: 'application/pdf',
            status: 'ACTIVE',
            expiresAt: 1_800_000_100,
            maxDownloads: null,
        });
        getSignedUrl.mockResolvedValue('https://example.com/download');

        const result = await lambdaHandler({ pathParameters: { shareId: 'share-001' } });

        expect(result.statusCode).toBe(200);
        expect(authorizeDownload).toHaveBeenCalledWith('share-001', 1_800_000_000, null);
    });

    test('rejects active shares without a valid expiration', async () => {
        getShareById.mockResolvedValue({ shareId: 'share-001', status: 'ACTIVE' });

        const result = await lambdaHandler({ pathParameters: { shareId: 'share-001' } });

        expect(result.statusCode).toBe(500);
        expect(getSignedUrl).not.toHaveBeenCalled();
    });
});
