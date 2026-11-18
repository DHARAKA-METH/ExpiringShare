jest.mock('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: jest.fn(),
}));

const mockSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: {
        from: jest.fn(() => ({ send: mockSend })),
    },
    DeleteCommand: jest.fn((input) => ({ input })),
    GetCommand: jest.fn((input) => ({ input })),
    PutCommand: jest.fn((input) => ({ input })),
    QueryCommand: jest.fn((input) => ({ input })),
    UpdateCommand: jest.fn((input) => ({ input })),
}));

const {
    createShare,
    deleteShare,
    getShareById,
    updateShare,
    activatePendingShare,
    authorizeDownload,
} = require('./shareRepository');

describe('shareRepository', () => {
    beforeEach(() => {
        process.env.TABLE_NAME = 'ExpiringShareLinks';
        mockSend.mockReset();
    });

    test('creates a share record', async () => {
        const share = { shareId: 'share-001', status: 'PENDING' };

        await expect(createShare(share)).resolves.toEqual(share);

        expect(mockSend).toHaveBeenCalledWith({
            input: {
                TableName: 'ExpiringShareLinks',
                Item: share,
                ConditionExpression: 'attribute_not_exists(shareId)',
            },
        });
    });

    test('gets a share by id', async () => {
        mockSend.mockResolvedValue({ Item: { shareId: 'share-001', status: 'ACTIVE' } });

        await expect(getShareById('share-001')).resolves.toEqual({
            shareId: 'share-001',
            status: 'ACTIVE',
        });
    });

    test('returns null when a share does not exist', async () => {
        mockSend.mockResolvedValue({});

        await expect(getShareById('missing')).resolves.toBeNull();
    });

    test('updates a share and returns the new record', async () => {
        mockSend.mockResolvedValue({ Attributes: { shareId: 'share-001', status: 'ACTIVE' } });

        await expect(updateShare('share-001', { status: 'ACTIVE' })).resolves.toEqual({
            shareId: 'share-001',
            status: 'ACTIVE',
        });
    });

    test('deletes a share and returns the old record', async () => {
        mockSend.mockResolvedValue({ Attributes: { shareId: 'share-001' } });

        await expect(deleteShare('share-001')).resolves.toEqual({ shareId: 'share-001' });
    });

    test('activates only a pending share', async () => {
        mockSend.mockResolvedValue({ Attributes: { shareId: 'share-001', status: 'ACTIVE' } });

        await expect(activatePendingShare('share-001', 1_800_086_400)).resolves.toEqual({
            shareId: 'share-001',
            status: 'ACTIVE',
        });

        expect(mockSend).toHaveBeenCalledWith({
            input: expect.objectContaining({
                TableName: 'ExpiringShareLinks',
                Key: { shareId: 'share-001' },
                ConditionExpression: 'attribute_exists(shareId) AND #status = :pendingStatus',
                ExpressionAttributeValues: {
                    ':pendingStatus': 'PENDING',
                    ':activeStatus': 'ACTIVE',
                    ':expiresAt': 1_800_086_400,
                    ':cleanupStatus': 'PENDING',
                    ':cleanupAt': 1_800_086_400,
                },
            }),
        });
    });

    test('atomically increments a limited download when active, unexpired, and below limit', async () => {
        mockSend.mockResolvedValue({ Attributes: { shareId: 'share-001', downloadCount: 3 } });

        await expect(authorizeDownload('share-001', 1_800_000_000, 3)).resolves.toEqual({
            shareId: 'share-001',
            downloadCount: 3,
        });

        expect(mockSend).toHaveBeenCalledWith({
            input: expect.objectContaining({
                TableName: 'ExpiringShareLinks',
                Key: { shareId: 'share-001' },
                UpdateExpression: 'SET #downloadCount = if_not_exists(#downloadCount, :zero) + :one',
                ConditionExpression: expect.stringContaining('#downloadCount < :maxDownloads'),
                ExpressionAttributeValues: expect.objectContaining({
                    ':active': 'ACTIVE',
                    ':now': 1_800_000_000,
                    ':maxDownloads': 3,
                }),
            }),
        });
    });

    test('atomically increments unlimited downloads without a maximum condition', async () => {
        mockSend.mockResolvedValue({ Attributes: { shareId: 'share-001', downloadCount: 1 } });

        await authorizeDownload('share-001', 1_800_000_000, null);

        const updateInput = mockSend.mock.calls[0][0].input;
        expect(updateInput.ConditionExpression).toBe('#status = :active AND #expiresAt > :now');
        expect(updateInput.ExpressionAttributeValues).not.toHaveProperty(':maxDownloads');
    });
});
