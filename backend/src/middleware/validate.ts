import { NextFunction, Request, Response } from 'express';
import { ObjectSchema } from 'joi';

export function validateBody(schema: ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ message: 'Validation failed', details: error.details });
    }
    req.body = value;
    next();
  };
}


