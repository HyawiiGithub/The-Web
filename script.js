// Vanguard Components — Live dashboard simulation
// Config
const COMPANY = {
  name: "Vanguard Components",
  monthsActive: 14,
  employees: 36,
  baseMonthlyRevenue: 420000, // starting baseline monthly revenue
  avgGrossMargin: 0.32, // 32% gross margin
  operatingMargin: 0.18, // 18% operating margin
};

// Utility
const fmt = n => n.toLocaleString(undefined, {style:'currency',currency:'USD',maximumFractionDigits:0});
const pct = v => (v*100).toFixed(1) + '%';

// DOM
const yearEl = document.getElementById('year');
const kpiRevenue = document.getElementById('kpi-revenue');
const kpiProfit = document.getElementById('kpi-profit');
const kpiMargin = document.getElementById('kpi-margin');
const feedEl = document.getElementById('feed');
const reportsTableBody = document.querySelector('#reportsTable tbody');
const intensity = document.getElementById('intensity');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const exportCsvBtn = document.getElementById('exportCsv');

yearEl.textContent = new Date().getFullYear();

// Simulation state
let running = true;
let tick = 0;
let cumulativeRevenue = 0;
let cumulativeProfit = 0;
let dataPoints = []; // {time, revenue, profit}
let feed = [];

// Initialize monthly baseline for 14 months (simulate historical monthly revenue)
function generateHistoricalMonths() {
  const months = [];
  for (let m = 0; m < COMPANY.monthsActive; m++) {
    // growth trend + seasonality + randomness
    const trend = 1 + 0.06 * Math.floor(m/3); // small step growth each quarter
    const season = 1 + 0.08 * Math.sin((m/12) * Math.PI * 2); // yearly seasonality
    const noise = 1 + (Math.random() - 0.5) * 0.18;
    const revenue = COMPANY.baseMonthlyRevenue * trend * season * noise;
    months.push(Math.round(revenue));
  }
  return months;
}

// Build quarterly reports from months
function buildQuarterlyReports(monthly) {
  const reports = [];
  // group months into quarters (Q1..)
  for (let i = 0; i < monthly.length; i += 3) {
    const quarterMonths = monthly.slice(i, i+3);
    const periodStart = i+1;
    const periodEnd = i + quarterMonths.length;
    const revenue = quarterMonths.reduce((a,b)=>a+b,0);
    // net profit uses operating margin plus some variability
    const margin = COMPANY.operatingMargin + (Math.random()-0.5)*0.04;
    const netProfit = Math.round(revenue * margin);
    const profitMargin = netProfit / revenue;
    const qIndex = Math.floor(i/3) + 1;
    const periodLabel = `Month ${periodStart} - ${periodEnd}`;
    const notes = generateNotes(revenue, netProfit, qIndex);
    reports.push({
      quarter: `Q${qIndex}`,
      period: periodLabel,
      revenue,
      netProfit,
      profitMargin,
      notes
    });
  }
  return reports;
}

function generateNotes(revenue, netProfit, qIndex) {
  const notes = [];
  if (qIndex === 1) notes.push("Launch quarter; strong direct-to-consumer uptake");
  if (qIndex === 2) notes.push("Wholesale partnerships expanded");
  if (qIndex === 3) notes.push("Subscription warranty introduced; margin uplift");
  if (qIndex === 4) notes.push("Holiday season; peak sales");
  if (netProfit / revenue > 0.2) notes.push("Exceptional margin due to high-margin bundles");
  return notes.join('; ');
}

// Render reports table
function renderReports(reports) {
  reportsTableBody.innerHTML = '';
  reports.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.quarter}</td>
      <td>${r.period}</td>
      <td>${fmt(r.revenue)}</td>
      <td>${fmt(r.netProfit)}</td>
      <td>${(r.profitMargin*100).toFixed(1)}%</td>
      <td>${r.notes}</td>
    `;
    reportsTableBody.appendChild(tr);
  });
}

// Chart setup
const ctx = document.getElementById('profitChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Cumulative Net Profit (USD)',
      data: [],
      borderColor: '#00d084',
      backgroundColor: 'rgba(0,208,132,0.08)',
      tension: 0.25,
      pointRadius: 0
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { display: true, ticks: { color: '#9aa6b2' } },
      y: { display: true, ticks: { color: '#9aa6b2' } }
    },
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    }
  }
});

// Initialize historical data into chart (simulate daily ticks for past months)
function seedHistoricalData(monthly) {
  // convert monthly revenue into many small sales events to seed the live chart
  const eventsPerMonth = 30; // seed 30 events per month
  monthly.forEach((monthRev, mi) => {
    const avgSale = monthRev / eventsPerMonth;
    for (let e = 0; e < eventsPerMonth; e++) {
      const sale = avgSale * (0.6 + Math.random()*0.8);
      const gross = sale * COMPANY.avgGrossMargin;
      const opProfit = sale * COMPANY.operatingMargin * (0.9 + Math.random()*0.2);
      pushEvent({
        time: `M${mi+1}-E${e+1}`,
        revenue: sale,
        profit: opProfit
      }, false);
    }
  });
  // update KPIs
  updateKpis();
  chart.update();
}

// push event to state and chart
function pushEvent(evt, showFeed = true) {
  tick++;
  cumulativeRevenue += evt.revenue;
  cumulativeProfit += evt.profit;
  dataPoints.push({
    time: new Date().toLocaleTimeString(),
    revenue: evt.revenue,
    profit: cumulativeProfit
  });
  // keep last 600 points
  if (dataPoints.length > 600) dataPoints.shift();

  // update chart
  chart.data.labels = dataPoints.map(d => d.time);
  chart.data.datasets[0].data = dataPoints.map(d => d.profit);
  chart.update('none');

  // feed
  if (showFeed) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${new Date().toLocaleTimeString()}</span><strong>${fmt(evt.revenue)}</strong>`;
    feedEl.prepend(li);
    // limit feed length
    while (feedEl.children.length > 50) feedEl.removeChild(feedEl.lastChild);
  }
  updateKpis();
}

// KPIs update
function updateKpis() {
  kpiRevenue.textContent = fmt(Math.round(cumulativeRevenue));
  kpiProfit.textContent = fmt(Math.round(cumulativeProfit));
  const margin = cumulativeProfit / (cumulativeRevenue || 1);
  kpiMargin.textContent = pct(margin);
}

// Live sales generator (every second)
let intervalId = null;
function startLiveStream() {
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(() => {
    if (!running) return;
    // intensity slider affects sale size and frequency multiplier
    const mult = parseFloat(intensity.value);
    // simulate between 1 and 3 sales per tick (weighted)
    const salesCount = Math.random() < 0.6 ? 1 : (Math.random() < 0.85 ? 2 : 3);
    for (let s = 0; s < salesCount; s++) {
      const base = COMPANY.baseMonthlyRevenue / 30 / 8; // baseline per-hour-ish sale
      const sale = Math.max(20, (base * (0.2 + Math.random()*1.8)) * mult);
      // profit uses operating margin plus small variability
      const profit = sale * (COMPANY.operatingMargin * (0.9 + Math.random()*0.3));
      pushEvent({ time: Date.now(), revenue: sale, profit }, true);
    }
  }, 1000);
}

// Controls
pauseBtn.addEventListener('click', () => {
  running = !running;
  pauseBtn.textContent = running ? 'Pause' : 'Resume';
});
resetBtn.addEventListener('click', () => {
  if (confirm('Reset live simulation and historical seed?')) {
    resetSimulation();
  }
});

// Export CSV
exportCsvBtn.addEventListener('click', () => {
  const headers = ['time','cumulativeProfit','revenue'];
  const rows = dataPoints.map((d,i) => [d.time, Math.round(d.profit), Math.round(d.revenue || 0)]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vanguard_profit_stream.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// Reset simulation
function resetSimulation() {
  tick = 0;
  cumulativeRevenue = 0;
  cumulativeProfit = 0;
  dataPoints = [];
  feedEl.innerHTML = '';
  chart.data.labels = [];
  chart.data.datasets[0].data = [];
  chart.update();
  // reseed historical
  const months = generateHistoricalMonths();
  seedHistoricalData(months);
  const reports = buildQuarterlyReports(months);
  renderReports(reports);
}

// Initial bootstrap
(function init(){
  const months = generateHistoricalMonths();
  const reports = buildQuarterlyReports(months);
  renderReports(reports);
  seedHistoricalData(months);
  startLiveStream();
})();

// small helper to keep memory light: trim old feed items periodically
setInterval(() => {
  while (feedEl.children.length > 80) feedEl.removeChild(feedEl.lastChild);
}, 5000);
