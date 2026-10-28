export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = schema.safeParse(dataToValidate);

      if (!parsed.success) {
        const issues = parsed.error.issues || parsed.error.errors || [];
        const details = issues.map((err) => ({
          field: err.path.join('.') || source,
          message: err.message
        }));

        return res.status(400).json({
          error: details.length > 0 ? details[0].message : 'Validation failed.',
          details
        });
      }

      // Replace with parsed/transformed data
      req[source] = parsed.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}
