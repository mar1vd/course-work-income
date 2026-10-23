import * as categoryService from '../services/category.service.js';
import { parseId, validateCategory } from '../utils/validators.js';

export async function list(req, res) {
  res.json(await categoryService.list());
}

export async function create(req, res) {
  res.status(201).json(await categoryService.create(validateCategory(req.body)));
}

export async function update(req, res) {
  const id = parseId(req.params.id);
  res.json(await categoryService.update(id, validateCategory(req.body)));
}

export async function remove(req, res) {
  await categoryService.remove(parseId(req.params.id));
  res.status(204).end();
}
