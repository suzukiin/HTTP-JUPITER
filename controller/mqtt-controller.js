const mqtt = require('mqtt');

let client = null;
let isConnected = false;

function buildBrokerUrl() {
    const broker = process.env.MQTT_BROKER;
    const port = process.env.MQTT_PORT || '1883';

    if (!broker) {
        return null;
    }

    return `mqtt://${broker}:${port}`;
}

function getClient() {
    if (client) {
        return client;
    }

    const brokerUrl = buildBrokerUrl();
    if (!brokerUrl) {
        console.warn('MQTT_BROKER is not configured. MQTT publish is disabled.');
        return null;
    }

    client = mqtt.connect(brokerUrl, {
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        reconnectPeriod: 3000,
        connectTimeout: 10000
    });

    client.on('connect', () => {
        isConnected = true;
        console.log(`Connected to MQTT broker at ${brokerUrl}`);
    });

    client.on('reconnect', () => {
        isConnected = false;
        console.warn('Reconnecting to MQTT broker...');
    });

    client.on('close', () => {
        isConnected = false;
    });

    client.on('error', (error) => {
        isConnected = false;
        console.error('MQTT client error:', error.message);
    });

    return client;
}

function publish(topic, payload) {
    const mqttClient = getClient();

    if (!mqttClient) {
        return Promise.resolve({ published: false, reason: 'broker_not_configured' });
    }

    if (!isConnected) {
        return Promise.resolve({ published: false, reason: 'broker_not_connected' });
    }

    return new Promise((resolve) => {
        mqttClient.publish(topic, JSON.stringify(payload), { qos: 1, retain: false }, (error) => {
            if (error) {
                resolve({ published: false, reason: error.message || 'publish_error' });
                return;
            }

            resolve({ published: true });
        });
    });
}

module.exports = {
    publish
};