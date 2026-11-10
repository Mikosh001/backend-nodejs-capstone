const jwt = require('jsonwebtoken')

function requireAuth (req, res, next) {
  const token = req.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1]
  if (!token) return res.status(401).json({ error: 'Authentication required' })

  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }).user.id
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

module.exports = requireAuth
