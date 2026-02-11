const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.userId = decoded.id;
        req.roleId = decoded.roleId;
        req.roleName = decoded.roleName;
        next();
    });
};

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.roleName) {
            return res.status(403).json({ message: 'Role not found' });
        }

        // Superadmin always has access
        if (req.roleName === 'Superadmin') return next();

        if (allowedRoles.includes(req.roleName)) {
            next();
        } else {
            res.status(403).json({ message: `Access denied. Requires one of: ${allowedRoles.join(', ')}` });
        }
    };
};

module.exports = { verifyToken, checkRole };
