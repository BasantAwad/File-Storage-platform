const { getDB } = require('../config/db');

async function getQuotaByUserId(userId) {
  const db = getDB();
  return db('quotas').where('user_id', userId).first();
}

async function createQuota(userId, maxStorage) {
  const db = getDB();
  const [quota] = await db('quotas').insert({
    user_id: userId,
    max_storage: maxStorage,
    used_storage: 0
  }).returning('*');
  return quota;
}

async function updateUsedStorage(userId, usedStorage) {
  const db = getDB();
  const [quota] = await db('quotas')
    .where('user_id', userId)
    .update({ used_storage: usedStorage })
    .returning('*');
  return quota;
}

module.exports = {
  getQuotaByUserId,
  createQuota,
  updateUsedStorage
};
