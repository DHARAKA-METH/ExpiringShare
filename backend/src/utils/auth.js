const getAuthenticatedUserSub = (event) => (
    event?.requestContext?.authorizer?.claims?.sub
    || event?.requestContext?.authorizer?.jwt?.claims?.sub
    || null
);

module.exports = {
    getAuthenticatedUserSub,
};
