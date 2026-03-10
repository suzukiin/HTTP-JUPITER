const PDFDocument = require('pdfkit');
const osController = require('./os-controller');
const snmpController = require('./snmp-controller');

function parseTimestamp(value) {
    if (!value || typeof value !== 'string') {
        return null;
    }

    const parsed = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

function analyzeConnectivity(logLines) {
    const lines = Array.isArray(logLines) ? logLines : [];

    const attempts = lines.filter((line) => /iniciando conexao lte/i.test(line.message || '')).length;
    const failures = lines.filter((line) => /falha ao estabelecer conexao lte/i.test(line.message || '')).length;
    const recoveries = lines.filter((line) => /conexao lte estabelecida com sucesso/i.test(line.message || '')).length;

    const events = [];
    let currentDropStart = null;

    lines.forEach((line) => {
        const message = line.message || '';
        const timestamp = parseTimestamp(line.timestamp);

        if (/falha ao estabelecer conexao lte/i.test(message) && timestamp && !currentDropStart) {
            currentDropStart = timestamp;
            return;
        }

        if (/conexao lte estabelecida com sucesso/i.test(message) && timestamp && currentDropStart) {
            const durationMs = timestamp.getTime() - currentDropStart.getTime();
            const durationSeconds = Math.max(Math.round(durationMs / 1000), 0);
            events.push({
                start: currentDropStart,
                end: timestamp,
                durationSeconds
            });
            currentDropStart = null;
        }
    });

    const totalDowntimeSeconds = events.reduce((acc, event) => acc + event.durationSeconds, 0);

    return {
        attempts,
        failures,
        recoveries,
        totalDowntimeSeconds,
        events
    };
}

function getNumericSnmpMetrics(snmpData) {
    const data = Array.isArray(snmpData) ? snmpData : [];

    return data
        .map((item) => {
            const value = typeof item.value === 'string' ? item.value.replace(',', '.') : item.value;
            const numeric = Number.parseFloat(value);

            if (!Number.isFinite(numeric)) {
                return null;
            }

            return {
                label: `${item.equipment || 'EQ'} - ${item.name || 'metric'}`,
                value: numeric
            };
        })
        .filter(Boolean)
        .slice(0, 8);
}

function drawConnectivitySummary(doc, analysis) {
    doc.fontSize(16).fillColor('#111111').text('Resumo de conectividade LTE/VPN');
    doc.moveDown(0.5);

    doc.fontSize(11)
        .fillColor('#333333')
        .text(`Tentativas de conexao: ${analysis.attempts}`)
        .text(`Falhas detectadas: ${analysis.failures}`)
        .text(`Reconexoes com sucesso: ${analysis.recoveries}`)
        .text(`Tempo total estimado de indisponibilidade: ${analysis.totalDowntimeSeconds}s`);

    doc.moveDown(0.6);

    if (analysis.events.length === 0) {
        doc.fontSize(10).fillColor('#666666').text('Nenhuma queda completa (falha -> reconexao) identificada no watchdog.log.');
        return;
    }

    doc.fontSize(11).fillColor('#111111').text('Eventos de queda e recuperacao:');
    analysis.events.slice(0, 10).forEach((event, index) => {
        const start = event.start.toISOString().replace('T', ' ').slice(0, 19);
        const end = event.end.toISOString().replace('T', ' ').slice(0, 19);
        doc.fontSize(10).fillColor('#333333').text(`${index + 1}. ${start} -> ${end} (${event.durationSeconds}s)`);
    });
}

function drawSnmpChart(doc, metrics) {
    doc.addPage();
    doc.fontSize(16).fillColor('#111111').text('Graficos de medidas SNMP (snapshot atual)');
    doc.moveDown(0.8);

    if (!metrics.length) {
        doc.fontSize(10).fillColor('#666666').text('Nao ha metricas SNMP numericas disponiveis para gerar grafico.');
        return;
    }

    const left = 70;
    const top = 140;
    const width = 460;
    const barHeight = 18;
    const barGap = 12;
    const max = Math.max(...metrics.map((m) => m.value), 1);

    metrics.forEach((metric, index) => {
        const y = top + index * (barHeight + barGap);
        const ratio = metric.value / max;
        const barWidth = Math.max(Math.round(width * ratio), 2);
        const label = metric.label.length > 52 ? `${metric.label.slice(0, 52)}...` : metric.label;

        doc.rect(left, y, width, barHeight).fillColor('#eeeeee').fill();
        doc.rect(left, y, barWidth, barHeight).fillColor('#ff8a00').fill();

        doc.fillColor('#222222')
            .fontSize(9)
            .text(label, left, y - 11, { width: width, ellipsis: true })
            .text(String(metric.value), left + width + 6, y + 3);
    });
}

async function createPdfReport(res) {
    const logs = osController.getSystemLogs();
    const watchdogLines = logs.watchdog && logs.watchdog.lines ? logs.watchdog.lines : [];
    const analysis = analyzeConnectivity(watchdogLines);

    let snmpData = [];
    try {
        snmpData = await snmpController.getSnmpData();
    } catch (error) {
        console.error('Error fetching SNMP data for report:', error);
    }

    const metrics = getNumericSnmpMetrics(snmpData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="mini-relatorio-${Date.now()}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    doc.fontSize(22).fillColor('#111111').text('JUPITER - Mini Relatorio Operacional');
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#666666').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
    doc.moveDown(1.2);

    drawConnectivitySummary(doc, analysis);
    drawSnmpChart(doc, metrics);

    doc.end();
}

module.exports = {
    createPdfReport
};
