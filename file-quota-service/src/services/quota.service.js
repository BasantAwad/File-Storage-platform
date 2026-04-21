const quotaRepo = require('../repositories/quota.repository');
const { publishQuotaExceeded } = require('../config/kafka');

async function verifyAndReserve(userId, newFileSize) {
  let quota = await quotaRepo.getQuotaByUserId(userId);
  
  if (!quota) {
    // For demo purposes, create default quota if none exists.
    // In reality, User/Auth service would initialize this on user creation.
    quota = await quotaRepo.createQuota(userId, 5368709120); // 5GB default
  }

  const projectedUsage = Number(quota.used_storage) + Number(newFileSize);

  if (projectedUsage > Number(quota.max_storage)) {
    // Publish to Kafka: quota.exceeded
    await publishQuotaExceeded(userId, quota.used_storage, quota.max_storage, newFileSize);
    
    return {
      allowed: false,
      current_used: quota.used_storage,
      max_storage: quota.max_storage
    };
  }

  // Update used storage
  await quotaRepo.updateUsedStorage(userId, projectedUsage);

  return {
    allowed: true,
    current_used: projectedUsage,
    max_storage: quota.max_storage
  };
}

module.exports = {
  verifyAndReserve
};
