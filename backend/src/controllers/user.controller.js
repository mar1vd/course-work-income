import * as userService from '../services/user.service.js';
import { parseId, validateUser } from '../utils/validators.js';

export async function list(req, res) {
  res.json(await userService.list());
}

export async function create(req, res) {
  res.status(201).json(await userService.create(validateUser(req.body, true)));
}

export async function update(req, res) {
  const id = parseId(req.params.id);
  res.json(await userService.update(id, validateUser(req.body, false)));
}

export async function remove(req, res) {
  await userService.remove(parseId(req.params.id), req.user.id);
  res.status(204).end();
}
