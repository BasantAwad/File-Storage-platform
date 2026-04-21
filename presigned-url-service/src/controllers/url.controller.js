const urlService = require('../services/url.service');

async function generateUrl(req, res) {
  try {
    const { file_id, user_id, action } = req.body;
    
    if (!file_id || !user_id) {
      return res.status(400).json({ error: 'file_id and user_id are required' });
    }

    const { url, expires_at } = await urlService.createPresignedUrl(file_id, user_id, action || 'download');

    return res.status(200).json({ 
      message: 'Presigned URL generated successfully',
      file_id,
      url,
      expires_at
    });

  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  generateUrl
};
