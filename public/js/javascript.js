window.document.addEventListener('DOMContentLoaded', () => {

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

    getSystemStatus();
    updateUptime();
    updateTraffic();
    updateSnmpTelemetry();
    setInterval(updateUptime, 60000);
    setInterval(updateTraffic, 30000);
    setInterval(getSystemStatus, 30000);
    setInterval(updateSnmpTelemetry, 30000);
});