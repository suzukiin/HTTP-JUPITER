const os = require('os');
const path = require('path');
const fs = require('fs');

const LOG_DIRECTORY = '/var/log';
const LOG_FILES = {
    init: 'init.log',
    watchdog: 'watchdog.log'
};

function getUptime() {
    const uptimeSeconds = os.uptime();
    const hours = Math.floor(uptimeSeconds / 3600).toFixed(0);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60).toFixed(0);
    return `${hours}h ${minutes}m`;
}

function getTrafficPpp0() {
    const ppp0File = path.join(__dirname, '..', 'config', 'ppp0_traffic.json');
    let trafficData = {
        rx_total: 0,
        tx_total: 0,
        rx_anterior: 0,
        tx_anterior: 0
    };

    if (fs.existsSync(ppp0File)) {
        try {
            trafficData = JSON.parse(fs.readFileSync(ppp0File, 'utf-8'));
        } catch (e) {
            console.error("Erro ao ler ppp0_traffic.json", e);
        }
    }

    const rxPath = '/sys/class/net/ppp0/statistics/rx_bytes';
    const txPath = '/sys/class/net/ppp0/statistics/tx_bytes';

    if (!fs.existsSync(rxPath) || !fs.existsSync(txPath)) {
        return trafficData; // Retorna o que tem se a interface não existir
    }

    const rxAtualStr = fs.readFileSync(rxPath, 'utf8');
    const txAtualStr = fs.readFileSync(txPath, 'utf8');

    const rxAtual = parseInt(rxAtualStr, 10) || 0;
    const txAtual = parseInt(txAtualStr, 10) || 0;

    if (rxAtual >= trafficData.rx_anterior) {
        trafficData.rx_total += (rxAtual - trafficData.rx_anterior);
    } else {
        trafficData.rx_total += rxAtual;
    }

    if (txAtual >= trafficData.tx_anterior) {
        trafficData.tx_total += (txAtual - trafficData.tx_anterior);
    } else {
        trafficData.tx_total += txAtual;
    }

    trafficData.rx_anterior = rxAtual;
    trafficData.tx_anterior = txAtual;

    fs.writeFileSync(ppp0File, JSON.stringify(trafficData, null, 2));
    return trafficData;
}

function parseLogLine(line) {
    const match = line.match(/^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s-\s(.*)$/);

    if (!match) {
        return {
            timestamp: null,
            message: line,
            raw: line
        };
    }

    return {
        timestamp: match[1],
        message: match[2],
        raw: line
    };
}

function readLogFile(fileName) {
    const filePath = path.join(LOG_DIRECTORY, fileName);

    if (!fs.existsSync(filePath)) {
        return {
            file: fileName,
            path: filePath,
            exists: false,
            lines: []
        };
    }

    const rawContent = fs.readFileSync(filePath, 'utf8');
    const lines = rawContent
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(parseLogLine);

    return {
        file: fileName,
        path: filePath,
        exists: true,
        lines
    };
}

function getSystemLogs() {
    return {
        init: readLogFile(LOG_FILES.init),
        watchdog: readLogFile(LOG_FILES.watchdog)
    };
}

module.exports = {
    getUptime,
    getTrafficPpp0,
    getSystemLogs
};