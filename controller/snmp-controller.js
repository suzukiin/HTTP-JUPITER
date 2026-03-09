const snmp = require('net-snmp');
const oidJson = require('../config/oid.json');

async function getSnmpData() {
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

        let results = [];
        for (let j = 0; j < oids.length; j++) {
            let data = await getOid(oids[j].oid);
            if (oids[j].type == "boolean") {
                let enumValue = oids[j].enum[data];
                results.push({
                    equipment: equipment.model,
                    name: oids[j].name,
                    value: enumValue
                });
            } else {
                results.push({
                    equipment: equipment.model,
                    name: oids[j].name,
                    value: data + (oids[j].unit ? `${oids[j].unit}` : '')
                });
            }
        }
        session.close();
        return results;
    }
}

module.exports = {
    getSnmpData
};