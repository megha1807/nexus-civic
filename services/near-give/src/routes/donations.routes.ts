import { Router, Request, Response, NextFunction } from 'express';
// @ts-ignore
import multer from 'multer';
import path from 'path';
import {
  createDonation,
  getDonation,
  getDonations,
  updateStatus
} from '../controllers/donations.controller';
import { authenticate, optionalAuth } from '../middlewares/auth';
import { z } from 'zod';
import { validate } from '../middlewares/validate';

const router = Router();

// Setup multer for temp uploads
const storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    const uploadDir = '/tmp/uploads';
    // ensure dir exists or handle it (docker container usually can just use /tmp)
    import('fs').then(fs => {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    });
  },
  filename: function (req: any, file: any, cb: any) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Input validation schemas
const createDonationSchema = z.object({
  itemName: z.string().min(2),
  category: z.string().min(2),
  description: z.string().min(5),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  accuracy: z.coerce.number().optional(),
  address: z.string().optional()
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'QUALITY_CHECK', 'MATCHED', 'COLLECTED', 'DELIVERED', 'REJECTED'])
});

router.post(
  '/',
  optionalAuth,
  upload.array('photos', 5),
  validate(createDonationSchema),
  createDonation
);

router.get('/', getDonations);
router.get('/:id', getDonation);
router.patch('/:id', authenticate, validate(updateStatusSchema), updateStatus);

export default router;
