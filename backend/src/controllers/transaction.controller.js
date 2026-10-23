import * as transactionService from '../services/transaction.service.js';
import { parseId, parsePagination, validatePeriod, validateTransaction, TYPES } from '../utils/validators.js';
import { ApiError } from '../utils/ApiError.js';

// GET /transactions?type=&categoryId=&from=&to=&q=&page=&limit=
export async function list(req, res) {
  const { type, categoryId, q } = req.query;
  if (type && !TYPES.includes(type)) throw ApiError.badRequest('Некоректний тип операції');
  const { from, to } = validatePeriod({ from: req.query.from, to: req.query.to });
  const filters = {
    type,
    categoryId: categoryId ? parseId(categoryId) : undefined,
    from: req.query.from ? from : undefined,
    to: req.query.to ? to : undefined,
    q: typeof q === 'string' ? q : undefined,
    ...parsePagination(req.query),
  };
  res.json(await transactionService.list(filters));
}

export async function create(req, res) {
  const data = validateTransaction(req.body);
  res.status(201).json(await transactionService.create(req.user.id, data));
}

export async function update(req, res) {
  const id = parseId(req.params.id);
  const data = validateTransaction(req.body);
  res.json(await transactionService.update(id, data));
}

export async function remove(req, res) {
  await transactionService.remove(parseId(req.params.id));
  res.status(204).end();
}
