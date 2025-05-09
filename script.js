// Initialize variables
let trades = [];
let growthChart;

// Helper function for date formatting
function padZero(num) {
    return num < 10 ? '0' + num : num;
}

// Helper function to get selected labels from a form
function getSelectedLabels(prefix = '') {
    const labels = [];
    const selector = prefix ? `input[name="${prefix}Labels"]:checked` : 'input[name="labels"]:checked';
    document.querySelectorAll(selector).forEach(checkbox => {
        labels.push(checkbox.value);
    });
    return labels;
}

// Helper function to set checkbox state in edit form
function setLabelCheckboxes(labels = []) {
    // Clear all checkboxes first
    document.querySelectorAll('input[name="editLabels"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Set checkboxes based on trade labels
    if (labels && labels.length > 0) {
        labels.forEach(label => {
            // Find checkbox by value instead of by ID
            const checkbox = document.querySelector(`input[name="editLabels"][value="${label}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
}

// Helper function to create label tags HTML
function createLabelTagsHtml(labels = []) {
    if (!labels || labels.length === 0) return '';
    
    return labels.map(label => 
        `<span class="label-tag label-${label}">${label}</span>`
    ).join(' ');
}

function initChart() {
    if (growthChart) {
        growthChart.destroy();
    }
    
    const ctx = document.getElementById('growthChart').getContext('2d');
    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Growth in R',
                data: [],
                borderColor: 'rgb(52, 152, 219)',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cumulative R'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Trades'
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 15
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    bodyFont: {
                        size: 14
                    },
                    padding: 10
                }
            }
        }
    });
}

function updateChart() {
    if (!growthChart) {
        initChart();
    }
    
    const filteredTrades = getFilteredTrades();
    const sortedTrades = [...filteredTrades].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
    );

    let cumulative = 0;
    const data = sortedTrades.map(trade => {
        cumulative += (trade.result === 'win') ? parseFloat(trade.rr) : -1;
        return cumulative;
    });

    const labels = sortedTrades.map(trade => {
        const date = new Date(trade.date);
        return `${padZero(date.getDate())}.${padZero(date.getMonth() + 1)}.${date.getFullYear()}`;
    });

    growthChart.data.labels = labels;
    growthChart.data.datasets[0].data = data;
    growthChart.update();
}

function updateSummary() {
    const filteredTrades = getFilteredTrades();
    const totalTrades = filteredTrades.length;
    const winTrades = filteredTrades.filter(t => t.result === 'win').length;
    const lossTrades = totalTrades - winTrades;
    
    const winRate = totalTrades > 0 ? (winTrades / totalTrades * 100).toFixed(1) : 0;
    const lossRate = totalTrades > 0 ? (lossTrades / totalTrades * 100).toFixed(1) : 0;
    
    const totalRR = filteredTrades.reduce((sum, trade) => 
        sum + (trade.result === 'win' ? parseFloat(trade.rr) : -1), 0);
    
    const avgRR = totalTrades > 0 ? (totalRR / totalTrades).toFixed(2) : 0;
    
    document.getElementById('totalTrades').textContent = totalTrades;
    document.getElementById('winTrades').textContent = winTrades;
    document.getElementById('lossTrades').textContent = lossTrades;
    document.getElementById('winRate').textContent = winRate + '%';
    document.getElementById('lossRate').textContent = lossRate + '%';
    document.getElementById('avgRR').textContent = avgRR;
}

function loadTrades() {
    const tradesJSON = localStorage.getItem('forexTrades');
    return tradesJSON ? JSON.parse(tradesJSON) : [];
}

function saveTrades(tradesToSave) {
    localStorage.setItem('forexTrades', JSON.stringify(tradesToSave));
    trades = tradesToSave;
    updateTradesTable();
    updateSummary();
    updateChart();
}

function updateTradesTable() {
    const tbody = document.querySelector('#tradesTable tbody');
    tbody.innerHTML = '';
    
    const filteredTrades = getFilteredTrades();
    filteredTrades.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    filteredTrades.forEach(trade => {
        const tr = document.createElement('tr');
        
        const dateObj = new Date(trade.date);
        const formattedDate = `${padZero(dateObj.getDate())}.${padZero(dateObj.getMonth() + 1)}.${dateObj.getFullYear()}`;
        
        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td>${trade.pair}</td>
            <td>${trade.rr}</td>
            <td>${trade.result}</td>
            <td>${trade.direction}</td>
            <td>${createLabelTagsHtml(trade.labels)}</td>
            <td>${trade.link ? `<button onclick="window.open('${trade.link}', '_blank')">TradingView</button>` : ''}</td>
            <td>
                <button class="edit-btn" data-id="${trade.id}">Edit</button>
                <button class="delete-btn" data-id="${trade.id}">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            openEditModal(id);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            trades = trades.filter(trade => trade.id !== id);
            saveTrades(trades);
        });
    });
}

function openEditModal(tradeId) {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;
    
    document.getElementById('editTradeId').value = trade.id;
    document.getElementById('editDate').value = trade.date;
    document.getElementById('editPair').value = trade.pair;
    document.getElementById('editRR').value = trade.rr;
    document.getElementById('editDirection').value = trade.direction;
    document.getElementById('editResult').value = trade.result;
    document.getElementById('editLink').value = trade.link || '';
    
    // Set label checkboxes based on trade labels
    setLabelCheckboxes(trade.labels);
    
    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

function getFilteredTrades() {
    const pair = document.getElementById('filterPair').value;
    const result = document.getElementById('filterResult').value;
    const direction = document.getElementById('filterDirection').value;
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;
    const label = document.getElementById('filterLabel').value;
    
    return trades.filter(trade => {
        if (pair && trade.pair !== pair) return false;
        
        if (result && trade.result !== result) return false;
        
        if (direction && trade.direction !== direction) return false;
        
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            const tradeDate = new Date(trade.date);
            fromDate.setHours(0, 0, 0, 0);
            tradeDate.setHours(0, 0, 0, 0);
            if (tradeDate < fromDate) return false;
        }
        
        if (dateTo) {
            const toDate = new Date(dateTo);
            const tradeDate = new Date(trade.date);
            toDate.setHours(0, 0, 0, 0);
            tradeDate.setHours(0, 0, 0, 0);
            if (tradeDate > toDate) return false;
        }
        
        if (label) {
            if (label === 'none') {
                if (trade.labels && trade.labels.length > 0) return false;
            } else {
                if (!trade.labels || !trade.labels.includes(label)) return false;
            }
        }
        
        return true;
    });
}

function resetAllFilters() {
    document.getElementById('filterPair').value = '';
    document.getElementById('filterResult').value = '';
    document.getElementById('filterDirection').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('filterLabel').value = '';
    
    updateTradesTable();
    updateSummary();
    updateChart();
}

// Document ready event handler
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners for the edit modal
    document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('editModal')) {
            closeEditModal();
        }
    });
    
    document.getElementById('editTradeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const tradeId = parseInt(document.getElementById('editTradeId').value);
        const tradeIndex = trades.findIndex(t => t.id === tradeId);
        
        if (tradeIndex !== -1) {
            trades[tradeIndex] = {
                id: tradeId,
                date: document.getElementById('editDate').value,
                pair: document.getElementById('editPair').value,
                rr: parseFloat(document.getElementById('editRR').value),
                result: document.getElementById('editResult').value,
                direction: document.getElementById('editDirection').value,
                link: document.getElementById('editLink').value,
                labels: getSelectedLabels('edit')
            };
            
            saveTrades(trades);
            closeEditModal();
        }
    });

    // Set up filter event listeners
    document.getElementById('filterPair').addEventListener('change', function() {
        updateTradesTable();
        updateSummary();
        updateChart();
    });

    document.getElementById('filterResult').addEventListener('change', function() {
        updateTradesTable();
        updateSummary();
        updateChart();
    });

    document.getElementById('filterDirection').addEventListener('change', function() {
        updateTradesTable();
        updateSummary();
        updateChart();
    });

    document.getElementById('filterDateFrom').addEventListener('change', function() {
        updateTradesTable();
        updateSummary();
        updateChart();
    });

    document.getElementById('filterDateTo').addEventListener('change', function() {
        updateTradesTable();
        updateSummary();
        updateChart();
    });

    document.getElementById('filterLabel').addEventListener('change', function() {
        updateTradesTable();
        updateSummary();
        updateChart();
    });

    document.getElementById('resetFilters').addEventListener('click', resetAllFilters);

    // Initialize the app
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    document.getElementById('rr').value = '2';
    trades = loadTrades();
    updateTradesTable();
    updateSummary();
    initChart();
    updateChart();

    // Set up form submission handler
    document.getElementById('tradeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newTrade = {
            id: Date.now(),
            date: document.getElementById('date').value,
            pair: document.getElementById('pair').value,
            rr: parseFloat(document.getElementById('rr').value),
            result: document.getElementById('result').value,
            direction: document.getElementById('direction').value,
            link: document.getElementById('link').value,
            labels: getSelectedLabels()
        };
        
        trades.push(newTrade);
        saveTrades(trades);

        // Check if it's a winning trade
        if (newTrade.result === 'win') {
            // Launch confetti

            confetti({
                particleCount: 100,
                startVelocity: 30,
                spread: 360,
                origin: {
                  x: Math.random(),
                  // since they fall down, start a bit higher than random
                  y: Math.random() - 0.2
                }
              });
              confetti({
                particleCount: 100,
                startVelocity: 30,
                spread: 360,
                origin: {
                  x: Math.random(),
                  // since they fall down, start a bit higher than random
                  y: Math.random() - 0.2
                }
              });
              confetti({
                particleCount: 100,
                startVelocity: 30,
                spread: 360,
                origin: {
                  x: Math.random(),
                  // since they fall down, start a bit higher than random
                  y: Math.random() - 0.2
                }
              });
            
        }
        
        document.getElementById('date').value = today;
        document.getElementById('link').value = '';
        // Clear labels
        document.querySelectorAll('input[name="labels"]').forEach(checkbox => {
            checkbox.checked = false;
        });
    });

    // Set up import/export handlers
    document.getElementById('exportBtn').addEventListener('click', function() {
        const dataStr = JSON.stringify(trades, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'forex_trades.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    });
    
    document.getElementById('importBtn').addEventListener('click', function() {
        document.getElementById('importFile').click();
    });
    
    document.getElementById('importFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedTrades = JSON.parse(e.target.result);
                if (Array.isArray(importedTrades)) {
                    // Ensure all imported trades have a labels property
                    importedTrades.forEach(trade => {
                        if (!trade.hasOwnProperty('labels')) {
                            trade.labels = [];
                        }
                    });
                    
                    trades = importedTrades;
                    saveTrades(trades);
                    alert('Trades imported successfully.');
                } else {
                    alert('Failed to import trades. Invalid data format.');
                }
            } catch (error) {
                alert('Error reading the file: ' + error.message);
            }
        };
        reader.readAsText(file);
    });
    
    // Set up Delete All Trades functionality
    document.getElementById('deleteAllBtn').addEventListener('click', function() {
        if (trades.length === 0) {
            alert('No trades to delete.');
            return;
        }
        
        const confirmation = confirm('Are you sure you want to delete ALL trades? This action cannot be undone.');
        if (confirmation) {
            trades = [];
            saveTrades(trades);
            alert('All trades have been deleted.');
        }
    });
});