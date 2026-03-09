const express = require('express');
const router = express.Router();
const configController = require('../controller/config-controller');
const osController = require('../controller/os-controller');

router.get('/', (req, res) => {
    res.render('dashboard', { config: configController.getInfo() });
});

router.get('/os/uptime', (req, res) => {
    res.send(osController.getUptime());
});

router.get('/os/traffic', (req, res) => {
    res.json(osController.getTrafficPpp0());
});

module.exports = router;