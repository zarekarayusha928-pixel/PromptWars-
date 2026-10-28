import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profileController.js';
import { getLogs, upsertLog, deleteLog } from '../controllers/logController.js';
import { getQuestions, updateQuestions } from '../controllers/questionController.js';
import { getSafetyEvents, createSafetyEvent } from '../controllers/safetyController.js';
import { exportProfile } from '../controllers/exportController.js';
import { requireAuth, requireProfileOwnership } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  profileIdParamSchema,
  profileDateParamSchema,
  profileUpdateSchema,
  symptomLogSchema,
  customQuestionsSchema,
  safetyEventSchema
} from '../validators/schemas.js';

const router = Router();

// Profile Details
router.get(
  '/:id',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  getProfile
);

router.put(
  '/:id',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  validate(profileUpdateSchema, 'body'),
  updateProfile
);

// Symptom Logs
router.get(
  '/:id/logs',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  getLogs
);

router.put(
  '/:id/logs/:date',
  validate(profileDateParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  validate(symptomLogSchema, 'body'),
  upsertLog
);

router.delete(
  '/:id/logs/:date',
  validate(profileDateParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  deleteLog
);

// Discussion Questions
router.get(
  '/:id/questions',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  getQuestions
);

router.put(
  '/:id/questions',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  validate(customQuestionsSchema, 'body'),
  updateQuestions
);

// Safety Red-Flag Events
router.get(
  '/:id/safety-events',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  getSafetyEvents
);

router.post(
  '/:id/safety-events',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  validate(safetyEventSchema, 'body'),
  createSafetyEvent
);

// Backup Export
router.get(
  '/:id/export',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  exportProfile
);

export default router;
