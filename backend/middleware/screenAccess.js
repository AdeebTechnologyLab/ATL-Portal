const TeacherScreenAssignment = require('../models/TeacherScreenAssignment');

const requireScreenAccess = (screenId) => {
    return async (req, res, next) => {
        if (req.user.role === 'admin') return next();
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        try {
            const assignment = await TeacherScreenAssignment.findOne({
                teacher: req.user._id,
                screenId
            });
            if (!assignment) {
                return res.status(403).json({ success: false, message: 'You do not have access to this screen. Contact admin.' });
            }
            next();
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
};

module.exports = { requireScreenAccess };
