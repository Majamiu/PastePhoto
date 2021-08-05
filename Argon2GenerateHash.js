const argon2 = require('argon2');

module.exports.saltHashPassword = async function (password) {
    const hash = await argon2.hash(password);
    return hash;
}

