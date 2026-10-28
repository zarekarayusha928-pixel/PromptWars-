import { z } from 'zod';
import { isValidDateStr } from '../utils/formatters.js';

export const VALID_BLEEDING_VALUES = ['None', 'Spotting', 'Light', 'Medium', 'Heavy'];

// Profile ID route param validation
export const profileIdParamSchema = z.object({
  id: z
    .string()
    .min(1, 'Profile ID cannot be empty')
    .max(64, 'Profile ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Profile ID can only contain letters, numbers, hyphens, and underscores')
});

// Date parameter validation
export const dateParamSchema = z.object({
  date: z
    .string()
    .refine((val) => isValidDateStr(val), {
      message: 'Invalid date format. Expected valid calendar date in YYYY-MM-DD format.'
    })
});

// Combined Profile + Date parameter validation
export const profileDateParamSchema = profileIdParamSchema.merge(dateParamSchema);

// Auth login schema
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required.' })
    .trim()
    .email('Please enter a valid email address.'),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(1, 'Password is required.')
});

// Auth signup schema
export const signupSchema = z.object({
  name: z
    .string({ required_error: 'Full name is required.' })
    .trim()
    .min(1, 'Full name cannot be empty.')
    .max(100, 'Name cannot exceed 100 characters.'),
  email: z
    .string({ required_error: 'A valid email address is required.' })
    .trim()
    .email('A valid email address is required.')
    .max(255, 'Email cannot exceed 255 characters.'),
  password: z
    .string({ required_error: 'Password must be at least 6 characters.' })
    .min(6, 'Password must be at least 6 characters.')
    .max(128, 'Password cannot exceed 128 characters.')
});

// Profile update schema
export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').max(100).optional(),
  age: z
    .union([z.number().int().min(1).max(130), z.null(), z.literal('')])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : val)),
  typicalCycleLength: z.number().int().min(15).max(60).optional(),
  typicalPeriodLength: z.number().int().min(1).max(15).optional(),
  upcomingVisitDate: z
    .union([
      z.string().refine((val) => isValidDateStr(val), 'Invalid date format YYYY-MM-DD'),
      z.literal(''),
      z.null()
    ])
    .optional(),
  doctorName: z.string().max(100).optional(),
  primaryPatternFocus: z.string().max(200).optional(),
  summaryBio: z.string().max(500).optional(),
  currentCycleDay: z.number().int().min(1).max(100).optional(),
  currentPhase: z.string().max(50).optional(),
  consentSettings: z.record(z.any()).optional()
});

// Symptom log schema
export const symptomLogSchema = z.object({
  date: z
    .string()
    .refine((val) => isValidDateStr(val), 'Invalid date format YYYY-MM-DD')
    .optional(),
  cycleDay: z.union([z.number().int().min(1).max(100), z.null()]).optional(),
  bleeding: z.enum(['None', 'Spotting', 'Light', 'Medium', 'Heavy']).default('None'),
  painScore: z.number().int().min(0).max(10).default(0),
  functionalImpact: z.boolean().default(false),
  impactTypes: z
    .array(z.string().max(100, 'Impact type cannot exceed 100 characters.'))
    .max(20, 'Impact types array cannot exceed 20 items.')
    .default([]),
  symptoms: z
    .array(z.string().max(100, 'Symptom cannot exceed 100 characters.'))
    .max(50, 'Symptoms array cannot exceed 50 items.')
    .default([]),
  energyRating: z.number().int().min(1).max(5).default(3),
  moodRating: z.number().int().min(1).max(5).default(3),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters.').default('')
});

// Custom discussion questions schema
export const customQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string().optional(),
        text: z.string().trim().min(1, 'Question text cannot be empty.').max(500, 'Question text cannot exceed 500 characters.'),
        inReport: z.boolean().optional().default(true)
      })
    )
    .max(50, 'Cannot exceed 50 questions.')
});

// Safety event creation schema
export const safetyEventSchema = z.object({
  eventDate: z.string().refine((val) => isValidDateStr(val), 'Invalid date format YYYY-MM-DD').optional(),
  triggeredDate: z.string().refine((val) => isValidDateStr(val), 'Invalid date format YYYY-MM-DD').optional(),
  date: z.string().refine((val) => isValidDateStr(val), 'Invalid date format YYYY-MM-DD').optional(),
  flagId: z.string().max(100).optional(),
  id: z.string().max(100).optional(),
  severity: z.string().max(50).default('urgent'),
  title: z.string().max(200).default('Safety Notice'),
  reason: z.string().max(500).default(''),
  action: z.string().max(500).default('Consult clinician or urgent services.'),
  triggeredFields: z.array(z.string().max(100)).default([])
});
