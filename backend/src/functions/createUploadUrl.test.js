jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn(() => ({})),
    PutObjectCommand: jest.fn((input) => ({ input })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn(),
}));

const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { lambdaHandler } = require('./createUploadUrl');

describe('createUploadUrl Lambda', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.UPLOAD_BUCKET = 'test-upload-bucket';
        getSignedUrl.mockResolvedValue('https://example.com/upload-url');
    });

    test('returns a presigned URL for a valid request', async () => {
        const result = await lambdaHandler({
            body: JSON.stringify({
                fileName: 'document.pdf',
                contentType: 'application/pdf',
                fileSize: 1024,
            }),
        });
        const body = JSON.parse(result.body);

        expect(result.statusCode).toBe(200);
        expect(body).toEqual({
            uploadUrl: 'https://example.com/upload-url',
            objectKey: expect.stringMatching(/^uploads\/.+-document\.pdf$/),
            expiresIn: 300,
            success: true,
        });
        expect(PutObjectCommand).toHaveBeenCalledWith({
            Bucket: 'test-upload-bucket',
            Key: expect.stringMatching(/^uploads\/.+-document\.pdf$/),
            ContentType: 'application/pdf',
        });
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
});
