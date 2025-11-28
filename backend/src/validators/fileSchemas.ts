import Joi from 'joi';

export const shareSchema = Joi.object({
  targetUserId: Joi.string().hex().length(24),
  targetUserEmail: Joi.string().email()
}).xor('targetUserId', 'targetUserEmail');


