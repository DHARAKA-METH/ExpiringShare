const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    DeleteCommand,
    GetCommand,
    PutCommand,
    QueryCommand,
    UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-south-1',
});

const documentClient = DynamoDBDocumentClient.from(dynamoClient);

const getTableName = () => {
    if (!process.env.TABLE_NAME) {
        throw new Error('TABLE_NAME environment variable is not configured');
    }

    return process.env.TABLE_NAME;
};

const createShare = async (share) => {
    if (!share || !share.shareId) {
        throw new Error('shareId is required');
    }

    await documentClient.send(
        new PutCommand({
            TableName: getTableName(),
            Item: share,
            ConditionExpression: 'attribute_not_exists(shareId)',
        }),
    );

    return share;
};

const getShareById = async (shareId) => {
    if (!shareId) {
        throw new Error('shareId is required');
    }

    const result = await documentClient.send(
        new GetCommand({
            TableName: getTableName(),
            Key: { shareId },
        }),
    );

    return result.Item || null;
};

const updateShare = async (shareId, updates) => {
    if (!shareId) {
        throw new Error('shareId is required');
    }

    const entries = Object.entries(updates || {});

    if (entries.length === 0) {
        throw new Error('At least one update field is required');
    }

    const expressionNames = {};
    const expressionValues = {};
    const assignments = entries.map(([field, value], index) => {
        const nameKey = `#field${index}`;
        const valueKey = `:value${index}`;

        expressionNames[nameKey] = field;
        expressionValues[valueKey] = value;

        return `${nameKey} = ${valueKey}`;
    });

    const result = await documentClient.send(
        new UpdateCommand({
            TableName: getTableName(),
            Key: { shareId },
            UpdateExpression: `SET ${assignments.join(', ')}`,
            ExpressionAttributeNames: expressionNames,
            ExpressionAttributeValues: expressionValues,
            ConditionExpression: 'attribute_exists(shareId)',
            ReturnValues: 'ALL_NEW',
        }),
    );

    return result.Attributes;
};

const activatePendingShare = async (shareId, expiresAt) => {
    if (!shareId) {
        throw new Error('shareId is required');
    }
    if (!Number.isInteger(expiresAt) || expiresAt <= 0) {
        throw new Error('A valid expiresAt timestamp is required');
    }

    const result = await documentClient.send(
        new UpdateCommand({
            TableName: getTableName(),
            Key: { shareId },
            UpdateExpression: 'SET #status = :activeStatus, expiresAt = :expiresAt, cleanupStatus = :cleanupStatus, cleanupAt = :cleanupAt',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
            ExpressionAttributeValues: {
                ':pendingStatus': 'PENDING',
                ':activeStatus': 'ACTIVE',
                ':expiresAt': expiresAt,
                ':cleanupStatus': 'PENDING',
                ':cleanupAt': expiresAt,
            },
            ConditionExpression: 'attribute_exists(shareId) AND #status = :pendingStatus',
            ReturnValues: 'ALL_NEW',
        }),
    );

    return result.Attributes;
};

const findExpiredShares = async (now) => {
    if (!Number.isInteger(now) || now <= 0) {
        throw new Error('A valid current timestamp is required');
    }

    const shares = [];
    let exclusiveStartKey;

    do {
        const result = await documentClient.send(new QueryCommand({
            TableName: getTableName(),
            IndexName: process.env.CLEANUP_INDEX_NAME || 'CleanupIndex',
            KeyConditionExpression: '#cleanupStatus = :pending AND #cleanupAt <= :now',
            ExpressionAttributeNames: {
                '#cleanupStatus': 'cleanupStatus',
                '#cleanupAt': 'cleanupAt',
            },
            ExpressionAttributeValues: {
                ':pending': 'PENDING',
                ':now': now,
            },
            ExclusiveStartKey: exclusiveStartKey,
        }));

        shares.push(...(result.Items || []));
        exclusiveStartKey = result.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return shares;
};

const listSharesByOwner = async (ownerSub) => {
    if (!ownerSub) {
        throw new Error('ownerSub is required');
    }

    const shares = [];
    let exclusiveStartKey;

    do {
        const result = await documentClient.send(new QueryCommand({
            TableName: getTableName(),
            IndexName: process.env.OWNER_INDEX_NAME || 'OwnerIndex',
            KeyConditionExpression: '#ownerSub = :ownerSub',
            ExpressionAttributeNames: {
                '#ownerSub': 'ownerSub',
            },
            ExpressionAttributeValues: {
                ':ownerSub': ownerSub,
            },
            ScanIndexForward: false,
            ExclusiveStartKey: exclusiveStartKey,
        }));

        shares.push(...(result.Items || []));
        exclusiveStartKey = result.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return shares;
};

const authorizeDownload = async (shareId, now, maxDownloads) => {
    if (!shareId) {
        throw new Error('shareId is required');
    }
    if (!Number.isInteger(now) || now <= 0) {
        throw new Error('A valid current timestamp is required');
    }
    if (maxDownloads !== null && (!Number.isInteger(maxDownloads) || maxDownloads <= 0)) {
        throw new Error('maxDownloads must be a positive integer or null');
    }

    const expressionAttributeNames = {
        '#status': 'status',
        '#expiresAt': 'expiresAt',
        '#downloadCount': 'downloadCount',
    };
    const expressionAttributeValues = {
        ':active': 'ACTIVE',
        ':now': now,
        ':zero': 0,
        ':one': 1,
    };
    let conditionExpression = '#status = :active AND #expiresAt > :now';

    if (maxDownloads !== null) {
        expressionAttributeValues[':maxDownloads'] = maxDownloads;
        conditionExpression += ' AND (attribute_not_exists(#downloadCount) OR #downloadCount < :maxDownloads)';
    }

    const result = await documentClient.send(
        new UpdateCommand({
            TableName: getTableName(),
            Key: { shareId },
            UpdateExpression: 'SET #downloadCount = if_not_exists(#downloadCount, :zero) + :one',
            ConditionExpression: conditionExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
        }),
    );

    return result.Attributes;
};

const deleteShare = async (shareId) => {
    if (!shareId) {
        throw new Error('shareId is required');
    }

    const result = await documentClient.send(
        new DeleteCommand({
            TableName: getTableName(),
            Key: { shareId },
            ReturnValues: 'ALL_OLD',
        }),
    );

    return result.Attributes || null;
};

module.exports = {
    createShare,
    getShareById,
    updateShare,
    activatePendingShare,
    findExpiredShares,
    listSharesByOwner,
    authorizeDownload,
    deleteShare,
};
