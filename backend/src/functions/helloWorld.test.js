const { lambdaHandler } = require('./helloWorld');

describe('helloWorld Lambda', () => {
    test('returns the provided name', async () => {
        const event = {
            queryStringParameters: {
                name: 'Dharaka',
            },
        };

        const result = await lambdaHandler(event);
        const body = JSON.parse(result.body);

        expect(result.statusCode).toBe(200);
        expect(result.headers['Content-Type']).toBe('application/json');
        expect(body).toEqual({
            message: 'Hello Dharaka!',
            application: 'ExpiringShare',
            success: true,
        });
    });

    test('uses World when no name is provided', async () => {
        const event = {
            queryStringParameters: null,
        };

        const result = await lambdaHandler(event);
        const body = JSON.parse(result.body);

        expect(result.statusCode).toBe(200);
        expect(body).toEqual({
            message: 'Hello World!',
            application: 'ExpiringShare',
            success: true,
        });
    });
});
