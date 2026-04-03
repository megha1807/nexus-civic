import { Router, Request, Response, NextFunction } from 'express';
import { registerNGO, findNearbyNGOs } from '../controllers/ngos.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
     res.status(403).json({ success: false, error: 'Admin access required' });
     return;
  }
  next();
};

router.post('/', authenticate, authorizeAdmin, registerNGO);
router.get('/nearby', findNearbyNGOs);

export default router;
