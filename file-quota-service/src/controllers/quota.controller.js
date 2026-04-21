const quotaService = require('../services/quota.service');

async function checkQuota(req, res) {
  try {
    const { user_id, new_file_size } = req.body;
    
    if (!user_id || !new_file_size) {
      return res.status(400).json({ error: 'user_id and new_file_size are required' });
    }

    const { allowed, current_used, max_storage } = await quotaService.verifyAndReserve(user_id, new_file_size);
    
    if (!allowed) {
      return res.status(403).json({ 
        error: 'Quota exceeded',
        current_used, 
        max_storage 
      });
    }

    return res.status(200).json({ 
      message: 'Quota check passed, space reserved',
      current_used, 
      max_storage 
    });

  } catch (error) {
    console.error('Error checking quota:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  checkQuota
};
