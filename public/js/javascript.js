window.document.addEventListener('DOMContentLoaded', () => {

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

    updateUptime();
    updateTraffic();
    setInterval(updateUptime, 60000);
    setInterval(updateTraffic, 30000);
});