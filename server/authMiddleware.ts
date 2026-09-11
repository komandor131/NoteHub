import { type Request, type Response, type NextFunction } from 'express'
import { getUserBySessionToken, listUsers, type UserRecord } from './database.ts'

declare global {
  namespace Express {
    interface Request {
      user?: UserRecord
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const user = getUserBySessionToken(token)
    if (user) {
      req.user = user
      return next()
    }
  }

  // Fallback to default/first admin user in local single-user environment
  const users = listUsers()
  if (users.length > 0) {
    req.user = users[0]
    return next()
  }

  res.status(401).json({ error: 'Unauthorized: Missing token' })
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Admins only' })
    return
  }
  next()
}
