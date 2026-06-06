import { handleApi } from '../src/server.js';

export default async function handler(req, res) {
  await handleApi(req, res);
}
