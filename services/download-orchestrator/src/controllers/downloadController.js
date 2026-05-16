const { createDownloadPlan } = require("../services/downloadService");
const { sendSuccess, sendError } = require("../utils/response");

const getDownloadPlan = async (req, res) => {
    try {
        const { file_id: fileId } = req.params;
        const { userId } = req.query;

        if (!userId) {
            return sendError(res, "userId is required", 400);
        }

        if (!/^file-\d+$/.test(fileId)) {
            return sendError(res, "File not found", 404);
        }

        const plan = await createDownloadPlan({ fileId, userId });

        return sendSuccess(res, "Download plan generated", { plan });
    } catch (error) {
        return sendError(res, "Failed to create download plan", 500, [error.message]);
    }
};

module.exports = {
    getDownloadPlan
};
