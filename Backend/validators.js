// Backward-compatibility bridge for validators
export {
  isValidProfileId,
  isValidDateStr
} from './utils/formatters.js';

export {
  VALID_BLEEDING_VALUES,
  symptomLogSchema
} from './validators/schemas.js';

import { symptomLogSchema } from './validators/schemas.js';
import { isValidDateStr } from './utils/formatters.js';

export function validateLogPayload(body, dateParam = null) {
  const targetDate = dateParam || body.date;
  if (!targetDate || !isValidDateStr(targetDate)) {
    return {
      isValid: false,
      errors: ['Invalid date format. Expected YYYY-MM-DD.'],
      targetDate
    };
  }

  const result = symptomLogSchema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues || result.error.errors || [];
    return {
      isValid: false,
      errors: issues.map((e) => e.message),
      targetDate
    };
  }

  return {
    isValid: true,
    errors: [],
    targetDate
  };
}
