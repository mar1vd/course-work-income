import * as auditService from '../services/audit.service.js';
import { AUDIT_ACTIONS, parseId, parsePagination, validatePeriod } from '../utils/validators.js';
import { ApiError } from '../utils/ApiError.js';

// GET /audit?userId=&action=&transactionId=&from=&to=&page=&limit=
export async function list(req, res) {
  const { action, userId, transactionId } = req.query;
  if (action && !AUDIT_ACTIONS.includes(action)) throw ApiError.badRequest('Некоректний тип дії');
  const { from, to } = validatePeriod({ from: req.query.from, to: req.query.to });
  const filters = {
    action,
    userId: userId ? parseId(userId) : undefined,
    transactionId: transactionId ? parseId(transactionId) : undefined,
    from: req.query.from ? from : undefined,
    to: req.query.to ? to : undefined,
    ...parsePagination(req.query),
  };
  res.json(await auditService.list(req.user, filters));
}
