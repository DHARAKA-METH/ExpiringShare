jest.mock('@aws-sdk/client-s3', () => ({
    DeleteObjectCommand: jest.fn((input) => ({ input })),
    S3Client: jest.fn(() => ({ send: mockSend })),
}));

jest.mock('../repositories/shareRepository', () => ({
    deleteShare: jest.fn(),
    findExpiredShares: jest.fn(),
}));

const mockSend = jest.fn();
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { deleteShare, findExpiredShares } = require('../repositories/shareRepository');
const { lambdaHandler } = require('./cleanupExpiredFiles');

describe('cleanupExpiredFiles Lambda', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.UPLOAD_BUCKET = 'test-upload-bucket';
        findExpiredShares.mockResolvedValue([
            { shareId: 'share-001', s3Key: 'uploads/share-001/document.pdf' },
        ]);
        mockSend.mockResolvedValue({});
    });

    test('deletes S3 objects before deleting metadata', async () => {
        const result = await lambdaHandler();

        expect(result).toEqual({ found: 1, deleted: 1, failed: 0 });
        expect(DeleteObjectCommand).toHaveBeenCalledWith({
            Bucket: 'test-upload-bucket',
            Key: 'uploads/share-001/document.pdf',
        });
        expect(deleteShare).toHaveBeenCalledWith('share-001');
        expect(findExpiredShares).toHaveBeenCalledWith(expect.any(Number));
    });

    test('keeps metadata when S3 deletion fails so it can retry', async () => {
        mockSend.mockRejectedValue(new Error('S3 failure'));

        await expect(lambdaHandler()).resolves.toEqual({ found: 1, deleted: 0, failed: 1 });
        expect(deleteShare).not.toHaveBeenCalled();
    });
});
