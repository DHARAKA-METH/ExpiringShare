jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn(() => ({ send: mockSend })),
    HeadObjectCommand: jest.fn((input) => ({ input })),
}));

jest.mock('../repositories/shareRepository', () => ({
    activatePendingShare: jest.fn(),
    getShareById: jest.fn(),
}));

const mockSend = jest.fn();
const { HeadObjectCommand } = require('@aws-sdk/client-s3');
const { activatePendingShare, getShareById } = require('../repositories/shareRepository');
const { lambdaHandler } = require('./completeUpload');

describe('completeUpload Lambda', () => {
    const eventFor = (shareId) => ({
        pathParameters: { shareId },
        requestContext: { authorizer: { claims: { sub: 'user-001' } } },
    });

    const pendingShare = {
        shareId: 'share-001',
        ownerSub: 'user-001',
        s3Key: 'uploads/share-001/document.pdf',
        contentType: 'application/pdf',
        fileSize: 1024,
        expiryHours: 24,
        status: 'PENDING',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.UPLOAD_BUCKET = 'test-upload-bucket';
        jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('verifies an uploaded object and activates the share', async () => {
        getShareById.mockResolvedValue(pendingShare);
        mockSend.mockResolvedValue({ ContentLength: 1024, ContentType: 'application/pdf' });
        activatePendingShare.mockResolvedValue({ ...pendingShare, status: 'ACTIVE' });

        const result = await lambdaHandler(eventFor('share-001'));

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual({
            shareId: 'share-001',
            status: 'ACTIVE',
            expiresAt: 1_800_086_400,
            shareUrl: '/s/share-001',
            success: true,
        });
        expect(HeadObjectCommand).toHaveBeenCalledWith({
            Bucket: 'test-upload-bucket',
            Key: 'uploads/share-001/document.pdf',
        });
        expect(activatePendingShare).toHaveBeenCalledWith('share-001', 1_800_086_400);
    });

    test('returns 404 for an unknown share', async () => {
        getShareById.mockResolvedValue(null);

        const result = await lambdaHandler(eventFor('missing'));

        expect(result.statusCode).toBe(404);
        expect(mockSend).not.toHaveBeenCalled();
    });

    test('returns 404 when the expected S3 object is missing', async () => {
        getShareById.mockResolvedValue(pendingShare);
        mockSend.mockRejectedValue({ name: 'NotFound', $metadata: { httpStatusCode: 404 } });

        const result = await lambdaHandler(eventFor('share-001'));

        expect(result.statusCode).toBe(404);
        expect(activatePendingShare).not.toHaveBeenCalled();
    });

    test('does not complete an already active share', async () => {
        getShareById.mockResolvedValue({ ...pendingShare, status: 'ACTIVE' });

        const result = await lambdaHandler(eventFor('share-001'));

        expect(result.statusCode).toBe(409);
        expect(mockSend).not.toHaveBeenCalled();
    });
});
