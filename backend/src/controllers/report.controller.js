import * as reportService from '../services/report.service.js';
import { validatePeriod } from '../utils/validators.js';

// GET /reports/summary?from=&to=
export async function summary(req, res) {
  const { from, to } = validatePeriod(req.query);
  res.json(await reportService.summary(from, to));
}

// POST /reports  { from, to } — зберегти знімок звіту в історію
export async function save(req, res) {
  const { from, to } = validatePeriod(req.body || {});
  res.status(201).json(await reportService.save(req.user.id, from, to));
}

// GET /reports — історія збережених звітів поточного користувача
export async function history(req, res) {
  res.json(await reportService.history(req.user.id));
}
