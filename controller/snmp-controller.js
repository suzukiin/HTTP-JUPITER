const snmp = require('net-snmp');
const oidJson = require('../config/oid.json');
const mqttController = require('./mqtt-controller');

function sanitizeTopicSegment(value) {
    return String(value || 'unknown')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_');
}

async function publishSnmpData(results) {
    const topicPrefix = process.env.MQTT_TOPIC_PREFIX || 'jupiter/snmp';
    let publishedCount = 0;
    let failedCount = 0;

    for (const item of results) {
        const equipment = sanitizeTopicSegment(item.equipment);
        const metric = sanitizeTopicSegment(item.name);
        const topic = `${topicPrefix}/${equipment}/${metric}`;

        const payload = {
            timestamp: new Date().toISOString(),
            equipment: item.equipment,
            metric: item.name,
            value: item.value
        };

        const response = await mqttController.publish(topic, payload);
        if (response.published) {
            publishedCount += 1;
        } else {
            failedCount += 1;
        }
    }

    return {
        publishedCount,
        failedCount,
        total: results.length
    };
}

async function getSnmpData() {
    const results = [];

    for (let i = 0; i < oidJson.equipments.length; i++) {
        const equipment = oidJson.equipments[i];

        const options = {
            port: 161,
            retries: 1,
            timeout: 5000,
            version: snmp.Version2c
        };

        const session = snmp.createSession(equipment.ip, equipment.community, options);
        const oids = equipment.OIDS;

        const getOid = (oid) => {
            return new Promise((resolve, reject) => {
                session.get([oid], (error, varbinds) => {
                    if (error) {
                        console.error(`Error fetching SNMP data for ${equipment.model} (OID: ${oid}):`, error);
                        resolve(null);
                    } else {
                        let value = null;
                        varbinds.forEach((varbind) => {
                            if (!snmp.isVarbindError(varbind)) {
                                value = varbind.value.toString();
                            }
                        });
                        resolve(value);
                    }
                });
            });
        };

        for (let j = 0; j < oids.length; j++) {
            let data = await getOid(oids[j].oid);

            if (data === null || data === undefined) {
                results.push({
                    equipment: equipment.model,
                    name: oids[j].name,
                    value: 'N/A'
                });
                continue;
            }

            if (oids[j].type == "boolean") {
                let enumValue = oids[j].enum && oids[j].enum[data] ? oids[j].enum[data] : data;
                results.push({
                    equipment: equipment.model,
                    name: oids[j].name,
                    value: enumValue
                });
            } else {
                const numericData = Number(data);
                const maskedValue = Number.isFinite(numericData) && typeof oids[j].mask === 'number'
                    ? numericData * oids[j].mask
                    : data;

                results.push({
                    equipment: equipment.model,
                    name: oids[j].name,
                    value: `${maskedValue}${oids[j].unit ? `${oids[j].unit}` : ''}`
                });
            }
        }
        session.close();
    }

    return results;
}

async function getSnmpDataAndPublish() {
    const data = await getSnmpData();
    const mqtt = await publishSnmpData(data);

    return {
        data,
        mqtt
    };
}

module.exports = {
    getSnmpData,
    getSnmpDataAndPublish
};