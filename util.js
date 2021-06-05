const jwt = require('jsonwebtoken');
const config = require('./config');
const getToken = (user) => {
  return jwt.sign({
    id: user.id,
    name: user.name,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,

  }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  })
}

const isAuth = (req, res, next) => {
  const token = req.headers.authorization;

  if (token) {
    const onlyToken = token.slice(7, token.length);
    jwt.verify(onlyToken, config.JWT_SECRET, (err, decode) => {
      if (err) {
        return res.status(401).send({ msg: 'Invalid Token' });
      }
      req.user = decode;
      next();
      return
    });
  } else {
    return res.status(401).send({ msg: "Token is not supplied." });
  }
}

const isAdmin = (req, res, next) => {
  console.log(req.user)
  if (req.user && req.user.isAdmin) {
    return next();
  }
  return res.status(401).send({ msg: 'Admin Token is not valid.' })
}

module.exports = {
  getToken, isAuth, isAdmin
}