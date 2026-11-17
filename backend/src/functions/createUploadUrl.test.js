jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn(() => ({})),
    PutObjectCommand: jest.fn((input) => ({ input })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn(),
}));

jest.mock('../repositories/shareRepository', () => ({
    createShare: jest.fn(),
}));

const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createShare } = require('../repositories/shareRepository');
const { lambdaHandler } = require('./createUploadUrl');

describe('createUploadUrl Lambda', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.UPLOAD_BUCKET = 'test-upload-bucket';
        process.env.TABLE_NAME = 'ExpiringShareLinks';
        getSignedUrl.mockResolvedValue('https://example.com/upload-url');
        createShare.mockResolvedValue();
    });

    test('returns a presigned URL for a valid request', async () => {
        const result = await lambdaHandler({
            body: JSON.stringify({
                fileName: 'document.pdf',
                contentType: 'application/pdf',
                fileSize: 1024,
                expiryHours: 24,
            }),
        });
        const body = JSON.parse(result.body);

        expect(result.statusCode).toBe(200);
        expect(body).toEqual({
            shareId: expect.any(String),
            uploadUrl: 'https://example.com/upload-url',
            s3Key: expect.stringMatching(/^uploads\/[\w-]+\/document\.pdf$/),
            expiryHours: 24,
            expiresIn: 300,
            success: true,
        });
        expect(PutObjectCommand).toHaveBeenCalledWith({
            Bucket: 'test-upload-bucket',
            Key: expect.stringMatching(/^uploads\/[\w-]+\/document\.pdf$/),
            ContentType: 'application/pdf',
        });
        expect(createShare).toHaveBeenCalledWith(expect.objectContaining({
            shareId: body.shareId,
            s3Key: body.s3Key,
            fileName: 'document.pdf',
            contentType: 'application/pdf',
            fileSize: 1024,
            status: 'PENDING',
            expiryHours: 24,
            downloadCount: 0,
        }));
        expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 300 });
    });

    test('rejects a request without required fields', async () => {
        const result = await lambdaHandler({ body: JSON.stringify({ fileName: 'document.pdf' }) });

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toEqual({
            message: 'fileName and contentType are required',
            success: false,
        });
        expect(getSignedUrl).not.toHaveBeenCalled();
    });

    test('rejects unsupported content types', async () => {
        const result = await lambdaHandler({
            body: JSON.stringify({ fileName: 'script.exe', contentType: 'application/octet-stream' }),
        });

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).message).toBe('Unsupported contentType');
    });

    test('rejects unsupported expiry durations', async () => {
        const result = await lambdaHandler({
            body: JSON.stringify({
                fileName: 'document.pdf',
                contentType: 'application/pdf',
                expiryHours: 2,
            }),
        });

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).message).toBe('expiryHours must be one of: 1, 24, or 168');
        expect(createShare).not.toHaveBeenCalled();
    });
});
