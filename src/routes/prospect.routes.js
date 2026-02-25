const express = require('express');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { createProspect, getProspects, updateProspect, deleteProspect, getProspectById } = require('../controllers/prospect.controller');

const router = express.Router();

// All authenticated users can allow viewing? 
// Or restricted? Assuming Sales, Manager, Superadmin can view/edit. 
// Engineer might only see Projects, but let's allow read for now.

router.get('/', verifyToken, getProspects);
router.get('/:id', verifyToken, getProspectById);
router.post('/', verifyToken, checkRole(['Sales', 'Manager', 'Superadmin']), createProspect);
router.put('/:id', verifyToken, checkRole(['Sales', 'Manager', 'Superadmin']), updateProspect);
router.delete('/:id', verifyToken, checkRole(['Superadmin', 'Manager']), deleteProspect);

module.exports = router;
