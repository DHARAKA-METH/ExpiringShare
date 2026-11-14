const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    DeleteCommand,
    GetCommand,
    PutCommand,
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

const activatePendingShare = async (shareId) => {
    if (!shareId) {
        throw new Error('shareId is required');
    }

    const result = await documentClient.send(
        new UpdateCommand({
            TableName: getTableName(),
            Key: { shareId },
            UpdateExpression: 'SET #status = :activeStatus',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
            ExpressionAttributeValues: {
                ':pendingStatus': 'PENDING',
                ':activeStatus': 'ACTIVE',
            },
            ConditionExpression: 'attribute_exists(shareId) AND #status = :pendingStatus',
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
    deleteShare,
};
