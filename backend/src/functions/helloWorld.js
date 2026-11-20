exports.lambdaHandler = async (event) => {
    const name = event.queryStringParameters?.name || "World";

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "*"
        },
        body: JSON.stringify({
            message: `Hello ${name}!`,
            application: "ExpiringShare",
            success: true
        })
    };
};
