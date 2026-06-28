import { type Request, type Response, type NextFunction } from 'express'
import { getUserBySessionToken, type UserRecord } from './database.ts'

declare global {
  namespace Express {
    interface Request {
      user?: UserRecord
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' })
    return
  }

  const token = authHeader.split(' ')[1]
  const user = getUserBySessionToken(token)

  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' })
    return
  }

  req.user = user
  next()
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Admins only' })
    return
  }
  next()
}
