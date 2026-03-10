window.document.addEventListener('DOMContentLoaded', () => {

    let lastLogsPayload = null;

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function updateUptime() {
        const uptimeElement = document.getElementById('uptime');
        if (uptimeElement) {
            fetch('/os/uptime')
                .then(response => response.text())
                .then(data => {
                    uptimeElement.textContent = data;
                })
                .catch(error => {
                    console.error('Error fetching uptime:', error);
                    uptimeElement.textContent = 'Error';
                });
        }
    }

    function updateTraffic() {
        const downloadElement = document.getElementById('download-traffic');
        const uploadElement = document.getElementById('upload-traffic');
        const downloadProgress = document.getElementById('download-traffic-progress');
        const uploadProgress = document.getElementById('upload-traffic-progress');
        
        const MAX_BYTES = 200 * 1024 * 1024;

        if (downloadElement && uploadElement) {
            fetch('/os/traffic')
                .then(response => response.json())
                .then(data => {
                    const rxBytes = data.rx_total || 0;
                    const txBytes = data.tx_total || 0;

                    downloadElement.textContent = formatBytes(rxBytes);
                    uploadElement.textContent = formatBytes(txBytes);

                    if (downloadProgress) {
                        const rxPercent = Math.min((rxBytes / MAX_BYTES) * 100, 100);
                        downloadProgress.style.width = `${rxPercent}%`;
                    }

                    if (uploadProgress) {
                        const txPercent = Math.min((txBytes / MAX_BYTES) * 100, 100);
                        uploadProgress.style.width = `${txPercent}%`;
                    }
                })
                .catch(error => {
                    console.error('Error fetching traffic:', error);
                    downloadElement.textContent = 'Error';
                    uploadElement.textContent = 'Error';
                });
        }
    }

    function formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }

    function getSystemStatus(){
        const status = document.getElementById('connection-badge');
        fetch('/os/status')
            .then(response => response.json())
            .then(data => {
                if(data.status === 'online'){
                    status.classList.remove('bg-danger', 'text-danger', 'border-danger');
                    status.classList.add('bg-success', 'text-success', 'border-success');
                    document.getElementById('connection-dot').classList.add('status-online');
                    document.getElementById('connection-dot').classList.remove('status-offline');
                    document.getElementById('connection-text').textContent = 'ONLINE';
                } else {
                    status.classList.remove('bg-success', 'text-success', 'border-success');
                    status.classList.add('bg-danger', 'text-danger', 'border-danger');
                    document.getElementById('connection-dot').classList.remove('status-online');
                    document.getElementById('connection-dot').classList.add('status-offline');
                    document.getElementById('connection-text').textContent = 'OFFLINE';
                }
            })
            .catch(error => {
                console.error('Error fetching system status:', error);
                status.classList.remove('bg-success', 'text-success', 'border-success');
                status.classList.add('bg-danger', 'text-danger', 'border-danger');
                document.getElementById('connection-dot').classList.remove('status-online');
                document.getElementById('connection-dot').classList.add('status-offline');
                document.getElementById('connection-text').textContent = 'OFFLINE';
            });
    }

    function renderSnmpTelemetry(data) {
        const telemetryContainer = document.getElementById('telemetry-container');
        const lastUpdateElement = document.getElementById('telemetry-last-update');

        if (!telemetryContainer) {
            return;
        }

        if (!Array.isArray(data) || data.length === 0) {
            telemetryContainer.innerHTML = `
                <div class="col-12 text-center text-muted py-5">
                    Nenhum dado SNMP disponível
                </div>
            `;

            if (lastUpdateElement) {
                lastUpdateElement.textContent = '--';
            }

            return;
        }

        const rows = data.map((item) => `
            <tr>
                <td class="text-muted">${escapeHtml(item.equipment || '--')}</td>
                <td>${escapeHtml(item.name || '--')}</td>
                <td class="text-light">${escapeHtml(item.value || '--')}</td>
            </tr>
        `).join('');

        telemetryContainer.innerHTML = `
            <div class="col-12">
                <div class="dash-card">
                    <div class="table-responsive">
                        <table class="table table-custom table-sm mb-0 align-middle">
                            <thead>
                                <tr>
                                    <th>Equipamento</th>
                                    <th>Métrica</th>
                                    <th>Valor SNMP</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleTimeString('pt-BR');
        }
    }

    function updateSnmpTelemetry() {
        fetch('/snmp')
            .then(response => response.json())
            .then(data => {
                renderSnmpTelemetry(data);
            })
            .catch(error => {
                console.error('Error fetching SNMP telemetry:', error);
                renderSnmpTelemetry([]);
            });
    }

    function renderLogLines(logData) {
        if (!logData || !Array.isArray(logData.lines) || logData.lines.length === 0) {
            return '<div class="text-muted small">Sem registros</div>';
        }

        const linesHtml = logData.lines.map((entry) => {
            const timestamp = entry.timestamp ? `<span class="text-secondary">${escapeHtml(entry.timestamp)}</span>` : '<span class="text-secondary">--</span>';
            const message = escapeHtml(entry.message || '--');

            return `
                <div class="small font-mono mb-1">
                    ${timestamp} <span class="text-light">- ${message}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="logs-scroll-area">
                ${linesHtml}
            </div>
        `;
    }

    function renderSystemLogs(data) {
        const logsContainer = document.getElementById('logs-container');
        const logsLastUpdate = document.getElementById('logs-last-update');

        if (!logsContainer) {
            return;
        }

        const initLog = data && data.init ? data.init : { lines: [] };
        const watchdogLog = data && data.watchdog ? data.watchdog : { lines: [] };

        logsContainer.innerHTML = `
            <div class="col-md-6">
                <div class="dash-card">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="text-muted text-uppercase small mb-0">init.log</h6>
                        <span class="badge bg-dark border border-secondary text-secondary font-mono">${initLog.exists ? 'OK' : 'N/A'}</span>
                    </div>
                    ${renderLogLines(initLog)}
                </div>
            </div>
            <div class="col-md-6">
                <div class="dash-card">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="text-muted text-uppercase small mb-0">watchdog.log</h6>
                        <span class="badge bg-dark border border-secondary text-secondary font-mono">${watchdogLog.exists ? 'OK' : 'N/A'}</span>
                    </div>
                    ${renderLogLines(watchdogLog)}
                </div>
            </div>
        `;

        if (logsLastUpdate) {
            logsLastUpdate.textContent = new Date().toLocaleTimeString('pt-BR');
        }
    }

    function updateSystemLogs() {
        fetch('/os/logs')
            .then(response => response.json())
            .then(data => {
                lastLogsPayload = data;
                renderSystemLogs(data);
            })
            .catch(error => {
                console.error('Error fetching system logs:', error);
                renderSystemLogs({
                    init: { exists: false, lines: [] },
                    watchdog: { exists: false, lines: [] }
                });
            });
    }

    window.fetchLogs = function fetchLogs() {
        fetch('/report/pdf')
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return response.blob();
            })
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `mini-relatorio-${Date.now()}.pdf`;
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                URL.revokeObjectURL(url);
            })
            .catch((error) => {
                console.error('Erro ao exportar relatorio PDF:', error);
            });
    };

    getSystemStatus();
    updateUptime();
    updateTraffic();
    updateSnmpTelemetry();
    updateSystemLogs();
    setInterval(updateUptime, 60000);
    setInterval(updateTraffic, 30000);
    setInterval(getSystemStatus, 30000);
    setInterval(updateSnmpTelemetry, 30000);
    setInterval(updateSystemLogs, 30000);
});