exports.lambdaHandler = async (event) => {
    const name = event.queryStringParameters?.name || "World";

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: `Hello ${name}!`,
            application: "ExpiringShare",
            success: true
        })
    };
};