const express = require('express');
const router = express.Router();
const configController = require('../controller/config-controller');
const osController = require('../controller/os-controller');
const snmpController = require('../controller/snmp-controller');

router.get('/', (req, res) => {
    res.render('dashboard', { config: configController.getInfo() });
});

router.get('/os/uptime', (req, res) => {
    res.send(osController.getUptime());
});

router.get('/os/traffic', (req, res) => {
    res.json(osController.getTrafficPpp0());
});

router.get('/snmp', async (req, res) => {
    try {
        const snmpData = await snmpController.getSnmpData();
        res.json(snmpData);
    } catch (error) {
        console.error('Error fetching SNMP data:', error);
        res.status(500).json({ error: 'Failed to fetch SNMP data' });
    }
});

module.exports = router;