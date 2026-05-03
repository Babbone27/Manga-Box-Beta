import { getTheme } from '../themes.js';

export const generateHTML = (mangaList, lettureList = [], wishlistList = [], themeName, nickname) => {
    const date = new Date().toLocaleDateString('it-IT');
    const theme = getTheme(themeName);

    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Serialize data for embedding - STRIP IMAGES to save space
    const cleanData = mangaList.map(m => ({
        ...m,
        coverUrl: undefined, // Remove cover
        cover: undefined     // Remove old field if present
    }));
    const cleanLetture = lettureList.map(m => ({
        ...m,
        coverUrl: undefined,
        cover: undefined
    }));
    const cleanWishlist = wishlistList.map(m => ({
        ...m,
        coverUrl: undefined,
        cover: undefined
    }));
    const escapedData = JSON.stringify(cleanData).replace(/<\/script>/g, '<\\/script>');
    const escapedLetture = JSON.stringify(cleanLetture).replace(/<\/script>/g, '<\\/script>');
    const escapedWishlist = JSON.stringify(cleanWishlist).replace(/<\/script>/g, '<\\/script>');

    // Theme CSS variables for use in client-side JS
    const themeColors = {
        background: theme.background,
        surface: theme.surface,
        primary: theme.primary,
        text: theme.text,
        secondaryText: theme.secondaryText,
        border: `${theme.secondaryText}20`,
        success: theme.success
    };

    const htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${nickname ? `Libreria di ${nickname}` : 'Manga Box'} - Resoconto Statistico</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --background: ${theme.background};
            --surface: ${theme.surface};
            --primary: ${theme.primary};
            --text: ${theme.text};
            --text-secondary: ${theme.secondaryText};
            --accent: ${theme.success}; 
            --border: ${theme.secondaryText}20;
            --hover-bg: ${hexToRgba(theme.primary, 0.15)};
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--background);
            color: var(--text);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        header {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            border-bottom: 2px solid var(--primary);
            padding-bottom: 20px;
            gap: 20px;
        }
        .logo-container {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-weight: 700;
            font-size: 32px;
            letter-spacing: -0.5px;
            display: flex;
            align-items: center;
            gap: 12px;
            color: var(--primary); 
        }
        .logo-icon { width: 40px; height: 40px; }
        
        .header-actions {
            display: flex;
            gap: 12px;
        }

        .btn {
            background: var(--surface);
            color: var(--text);
            border: 1px solid var(--border);
            padding: 8px 16px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }
        .btn:hover { background: var(--hover-bg); border-color: var(--primary); }
        .btn.active { background: var(--primary); color: #000; border-color: var(--primary); }

        /* Stats Grid */
        .stats-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: var(--surface);
            padding: 20px;
            border-radius: 16px;
            flex: 1;
            min-width: 160px;
            border: 1px solid var(--border);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .stat-icon {
            position: absolute;
            top: -10px;
            right: -10px;
            font-size: 60px;
            opacity: 0.05;
            transform: rotate(15deg);
        }
        .stat-title {
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 8px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .stat-value {
            font-size: 28px;
            font-weight: bold;
            color: var(--text);
        }
        .stat-subtext {
            font-size: 12px;
            color: var(--primary);
            margin-top: 6px;
            font-weight: 500;
        }

        /* Charts & Lists */
        .charts-container { display: flex; flex-direction: column; gap: 24px; }
        .chart-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 16px;
        }
        .chart-card {
            background: var(--surface);
            border-radius: 16px;
            padding: 20px;
            border: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            min-height: 300px;
        }
        .chart-card.wide { grid-column: span 2; }
        @media (max-width: 768px) { .chart-card.wide { grid-column: span 1; } }
        
        .chart-title {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 16px;
            color: var(--text);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .chart-title::before {
            content: '';
            display: block;
            width: 4px;
            height: 16px;
            background: var(--primary);
            border-radius: 2px;
        }
        canvas { position: absolute !important; top: 0; left: 0; width: 100% !important; height: 100% !important; }

        /* Custom Scrollbar per l'HTML export */
        .view-graph {
            scrollbar-width: thin;
            scrollbar-color: var(--primary) rgba(0, 0, 0, 0.1);
        }
        .view-graph::-webkit-scrollbar { height: 8px; width: 8px; }
        .view-graph::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.1); border-radius: 10px; }
        .view-graph::-webkit-scrollbar-thumb { background-color: var(--primary); border-radius: 10px; border: 2px solid var(--surface); }

        /* Text Mode Styles */
        .data-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            overflow-y: auto;
            max-height: 300px;
        }
        .data-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: rgba(255,255,255,0.03);
            border-radius: 6px;
            font-size: 13px;
        }
        .data-label { color: var(--text-secondary); }
        .data-val { font-weight: bold; color: var(--text); }

        /* Filter Section (Mid-page) */
        .filter-section {
            margin: 40px 0 20px 0;
            padding: 20px;
            background: var(--surface);
            border-radius: 12px;
            border: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        .filter-title { font-weight: bold; font-size: 16px; margin-right: auto; }
        
        select {
            background: var(--background);
            color: var(--text);
            border: 1px solid var(--border);
            padding: 8px 12px;
            border-radius: 12px;
            outline: none;
            cursor: pointer;
            font-size: 14px;
            min-width: 150px;
        }

        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: var(--text-secondary);
        }
        
        /* Utility classes */
        .hidden { display: none !important; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="logo-container">
                <div class="logo-icon">
                    <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <!-- NEW Top Face (Deep Dark 40% mix) -->
                        <path d="M 10 25 L 50 5 L 90 25 L 50 45 Z" style="fill: color-mix(in srgb, currentColor, black 40%);" />
                    
                        <!-- Left Face (Base Color) -->
                        <path d="M 10 25 L 50 45 L 50 95 L 10 75 Z" style="fill: currentColor;" />
                        
                        <!-- Right Face (Shaded 30% Black mix) -->
                        <path d="M 50 45 L 90 25 L 90 75 L 50 95 Z" style="fill: color-mix(in srgb, currentColor, black 30%);" />
                        
                        <!-- Side Details (Dark Accents 50% mix) -->
                        <path d="M 20 50 L 40 60 L 40 56 L 20 46 Z" style="fill: color-mix(in srgb, currentColor, black 50%);" />
                        <path d="M 20 65 L 40 75 L 40 71 L 20 61 Z" style="fill: color-mix(in srgb, currentColor, black 50%);" />
                        
                        <!-- Speech Bubble (Solid White) -->
                        <path d="M 58 55 L 82 43 L 82 58 L 76 61 L 72 68 L 68 65 L 58 70 Z" fill="#ffffff" />
                        
                        <!-- Bubble Dots -->
                        <circle cx="65" cy="60" r="2" fill="currentColor" />
                        <circle cx="70" cy="57.5" r="2" fill="currentColor" />
                        <circle cx="75" cy="55" r="2" fill="currentColor" />
                    </svg>
                </div>
                <div>
                    <div>Manga Box</div>
                    <div style="font-size: 14px; font-weight: normal; color: var(--text-secondary);">Resoconto Statistico${nickname ? ` di ${nickname}` : ''}</div>
                </div>
            </div>
            
            <div class="header-actions">
                <button class="btn active" id="btnGraph" onclick="setMode('graph')">📊 Grafici</button>
                <button class="btn" id="btnText" onclick="setMode('text')">📝 Testuale</button>
            </div>
        </header>

        <!-- Main Stats (Global) -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">📚</div>
                <div class="stat-title">Opere Totali</div>
                <div class="stat-value" id="totalWorks">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📖</div>
                <div class="stat-title">Volumi Totali</div>
                <div class="stat-value" id="totalVolumes">-</div>
                <div class="stat-subtext" id="readStats">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-title">Spesa Totale</div>
                <div class="stat-value" id="totalCost">-</div>
                <div class="stat-subtext" id="avgCost">-</div>
            </div>
        </div>

        <div class="charts-container" id="mainContainer">
            <!-- Row 1 -->
            <div class="chart-row">
                <div class="chart-card">
                    <div class="chart-title">Stato Serie</div>
                    <div class="view-graph" style="flex: 1; position: relative; width: 100%; overflow-x: auto; overflow-y: hidden; padding-bottom: 12px; min-height: 0; min-width: 0;">
                        <div style="position: relative; min-width: 100%; min-height: 100%; height: 100%;"><canvas id="statusChart"></canvas></div>
                    </div>
                    <div class="view-text hidden" id="statusList"></div>
                </div>
                <div class="chart-card">
                    <div class="chart-title">Spesa per Editore</div>
                    <div class="view-graph" style="flex: 1; position: relative; width: 100%; overflow-x: auto; overflow-y: hidden; padding-bottom: 12px; min-height: 0; min-width: 0;">
                        <div style="position: relative; min-width: 100%; min-height: 100%; height: 100%;"><canvas id="publisherCostChart"></canvas></div>
                    </div>
                    <div class="view-text hidden" id="publisherCostList"></div>
                </div>
                <div class="chart-card">
                    <div class="chart-title">Fasce di prezzo</div>
                    <div class="view-graph" style="flex: 1; position: relative; width: 100%; overflow-x: auto; overflow-y: hidden; padding-bottom: 12px; min-height: 0; min-width: 0;">
                        <div style="position: relative; min-width: 100%; min-height: 100%; height: 100%;"><canvas id="priceRangeChart"></canvas></div>
                    </div>
                    <div class="view-text hidden" id="priceRangeList"></div>
                </div>
            </div>

            <!-- Row 2 -->
            <div class="chart-row">
                <div class="chart-card">
                    <div class="chart-title">Target per Serie</div>
                    <div class="view-graph" style="flex: 1; position: relative; width: 100%; overflow-x: auto; overflow-y: hidden; padding-bottom: 12px; min-height: 0; min-width: 0;">
                        <div style="position: relative; min-width: 100%; min-height: 100%; height: 100%;"><canvas id="targetSeriesChart"></canvas></div>
                    </div>
                    <div class="view-text hidden" id="targetSeriesList"></div>
                </div>
                <div class="chart-card wide">
                    <div class="chart-title">Editore per Serie</div>
                    <div class="view-graph" style="flex: 1; position: relative; width: 100%; overflow-x: auto; overflow-y: hidden; padding-bottom: 12px; min-height: 0; min-width: 0;">
                        <div style="position: relative; min-width: 100%; min-height: 100%; height: 100%;"><canvas id="publisherSeriesChart"></canvas></div>
                    </div>
                    <div class="view-text hidden" id="publisherSeriesList"></div>
                </div>
            </div>

             <!-- Row 3 -->
            <div class="chart-row">
                <div class="chart-card">
                    <div class="chart-title">Target per Volume</div>
                    <div class="view-graph" style="flex: 1; position: relative; width: 100%; overflow-x: auto; overflow-y: hidden; padding-bottom: 12px; min-height: 0; min-width: 0;">
                        <div style="position: relative; min-width: 100%; min-height: 100%; height: 100%;"><canvas id="targetVolumeChart"></canvas></div>
                    </div>
                    <div class="view-text hidden" id="targetVolumeList"></div>
                </div>
                <div class="chart-card wide">
                    <div class="chart-title">Editore per Volume</div>
                    <div class="view-graph" style="flex: 1; position: relative; width: 100%; overflow-x: auto; overflow-y: hidden; padding-bottom: 12px; min-height: 0; min-width: 0;">
                        <div style="position: relative; min-width: 100%; min-height: 100%; height: 100%;"><canvas id="publisherVolumeChart"></canvas></div>
                    </div>
                    <div class="view-text hidden" id="publisherVolumeList"></div>
                </div>
            </div>

            <!-- FILTER SECTION FOR GROWTH -->
            <div class="filter-section">
                <div class="filter-title">Analisi Temporale</div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div style="font-size: 13px; color: var(--text-secondary);">Filtra per:</div>
                    <select id="yearSelect">
                        <option value="all">Tutti gli anni</option>
                    </select>
                    <select id="monthSelect" disabled>
                        <option value="all">Tutti i mesi</option>
                    </select>
                </div>
            </div>

            <!-- Row 4: Growth (Filtered) -->
            <div class="chart-row">
                <div class="chart-card">
                    <div class="chart-title">Andamento Volumi Totali</div>
                    <div class="view-graph" style="flex: 1; position: relative; width: 100%; overflow-x: auto; overflow-y: hidden; padding-bottom: 12px; min-height: 0; min-width: 0;"><canvas id="totalVolumeGrowthChart"></canvas></div>
                    <div class="view-text hidden" id="totalVolumeGrowthList"></div>
                </div>
                <div class="chart-card wide">
                    <div class="chart-title" id="growthTitle">Crescita Collezione (Volumi)</div>
                    <div class="view-graph" style="flex: 1; position: relative; width: 100%; overflow-x: auto; overflow-y: hidden; padding-bottom: 12px; min-height: 0; min-width: 0;"><canvas id="growthChart"></canvas></div>
                    <div class="view-text hidden" id="growthList"></div>
                </div>
            </div>
            
            <!-- Row 5: Growth (Filtered) -->
            <div class="chart-row">
                <div class="chart-card">
                    <div class="chart-title">Andamento Spesa Totale</div>
                    <div class="view-graph" style="flex: 1; position: relative; width: 100%; overflow-x: auto; overflow-y: hidden; padding-bottom: 12px; min-height: 0; min-width: 0;"><canvas id="costGrowthChart"></canvas></div>
                    <div class="view-text hidden" id="costGrowthList"></div>
                </div>
                <div class="chart-card wide">
                    <div class="chart-title" id="readGrowthTitle">Volumi Letti nel Tempo</div>
                    <div class="view-graph" style="flex: 1; position: relative; width: 100%; overflow-x: auto; overflow-y: hidden; padding-bottom: 12px; min-height: 0; min-width: 0;"><canvas id="readGrowthChart"></canvas></div>
                    <div class="view-text hidden" id="readGrowthList"></div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            Generato il ${date} - Backup dati incluso (senza immagini)
        </div>
    </div>

    <script>
        // EMBEDDED DATA
        const RAW_DATA = ${escapedData};
        const RAW_LETTURE = ${escapedLetture};
        const RAW_WISHLIST = ${escapedWishlist};
        const COLORS = ${JSON.stringify(themeColors)};

        // STATE
        let selectedYear = 'all';
        let selectedMonth = 'all';
        let charts = {};
        let viewMode = 'graph'; // 'graph' or 'text'

        // HELPERS
        const LABELS = {
            months: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
        };
        const PALETTES = {
            publisher: {'Planet Manga': '#D32F2F', 'Star Comics': '#1976D2', 'J-pop': '#FBC02D', 'Panini Comics': '#D32F2F', 'Goen': '#7B1FA2', 'Dynit': '#00796B', 'Magic Press': '#E64A19', 'FlashBook': '#388E3C', 'Bao Publishing': '#5D4037', 'Coconino Press': '#F57C00', 'Sconosciuto': '#616161'},
            status: {'Serie in corso': '#66BB6A', 'Serie completa': '#42A5F5', 'Volume unico': '#FFCA28', 'Pausa': '#FFA726', 'Cancellata': '#EF5350', 'Sconosciuto': '#BDBDBD'},
            target: {'Seinen': '#7E57C2', 'Shonen': '#FF7043', 'Shojo': '#F06292', 'Josei': '#26A69A', 'Kodomo': '#D4E157', 'Altro': '#78909C', 'Sconosciuto': '#BDBDBD'}
        };
        function getPublisherColor(name) { return PALETTES.publisher[name] || '#90A4AE'; }
        function getStatusColor(name) { return PALETTES.status[name] || '#BDBDBD'; }
        function getTargetColor(name) { return PALETTES.target[name] || '#78909C'; }

        // INIT
        window.onload = () => {
             initSelectors();
             updateGlobalStats();
             updateGrowthStats();
        };

        function setMode(mode) {
            viewMode = mode;
            document.getElementById('btnGraph').className = mode === 'graph' ? 'btn active' : 'btn';
            document.getElementById('btnText').className = mode === 'text' ? 'btn active' : 'btn';

            document.querySelectorAll('.view-graph').forEach(el => el.classList.toggle('hidden', mode !== 'graph'));
            document.querySelectorAll('.view-text').forEach(el => el.classList.toggle('hidden', mode !== 'text'));
        }

        function initSelectors() {
            const years = new Set();
            RAW_DATA.forEach(m => {
                if(m.dateAdded) years.add(new Date(m.dateAdded).getFullYear());
                if(m.volumes) m.volumes.forEach(v => {
                    if(v.dateAdded) years.add(new Date(v.dateAdded).getFullYear());
                });
            });
            const sortedYears = Array.from(years).sort((a,b) => b-a).filter(y => !isNaN(y));
            const yearSelect = document.getElementById('yearSelect');
            sortedYears.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.innerText = y;
                yearSelect.appendChild(opt);
            });
            const monthSelect = document.getElementById('monthSelect');
            LABELS.months.forEach((m, i) => {
                const opt = document.createElement('option');
                opt.value = i + 1;
                opt.innerText = m;
                monthSelect.appendChild(opt);
            });

            yearSelect.addEventListener('change', (e) => {
                selectedYear = e.target.value;
                monthSelect.disabled = selectedYear === 'all';
                if(selectedYear === 'all') { selectedMonth = 'all'; monthSelect.value = 'all'; }
                updateGrowthStats();
            });
            monthSelect.addEventListener('change', (e) => {
                selectedMonth = e.target.value;
                updateGrowthStats();
            });
        }

        // TEXT RENDER HELPER
        function renderList(id, data, isMoney=false) {
            const container = document.getElementById(id);
            container.innerHTML = data.map(d => \`
                <div class="data-row">
                    <span class="data-label">\${d.label || d[0]}</span>
                    <span class="data-val">\${isMoney ? '€ ' + (d.value||d[1]).toFixed(2) : (d.value||d[1])}</span>
                </div>
            \`).join('');
        }

        // --- GLOBAL STATS (Unfiltered) ---
        function updateGlobalStats() {
            let tWorks = RAW_DATA.length;
            let tVols = 0;
            let tRead = 0;
            let tCost = 0;

            const breakdown = {
                status: {}, pubCost: {}, costRange: { '0-4.99€': 0, '5-9.99€': 0, '10-14.99€': 0, '15€+': 0 },
                targetSeries: {}, pubSeries: {}, targetVol: {}, pubVol: {}
            };

            const count = (obj, key, val=1) => obj[key] = (obj[key]||0)+val;

            RAW_DATA.forEach(m => {
                count(breakdown.status, m.status || 'Sconosciuto');
                count(breakdown.targetSeries, m.target || 'Sconosciuto');
                count(breakdown.pubSeries, m.publisher || 'Sconosciuto');
                
                if (m.volumes) {
                    tVols += m.volumes.length;
                    m.volumes.forEach(v => {
                        if(v.read) tRead++;
                        const p = parseFloat(v.price);
                        if(!isNaN(p)) {
                            tCost += p;
                            count(breakdown.pubCost, m.publisher || 'Sconosciuto', p);
                            if(p<5) breakdown.costRange['0-4.99€']++;
                            else if(p<10) breakdown.costRange['5-9.99€']++;
                            else if(p<15) breakdown.costRange['10-14.99€']++;
                            else breakdown.costRange['15€+']++;
                        }
                        count(breakdown.targetVol, m.target || 'Sconosciuto');
                        count(breakdown.pubVol, m.publisher || 'Sconosciuto');
                    });
                }
            });

            // Letture additions
            let lettureRead = 0;
            RAW_LETTURE.forEach(m => {
                if (m.volumes) {
                    m.volumes.forEach(v => {
                        if (v.read) lettureRead++;
                    });
                }
            });
            const globalReadVolumes = tRead + lettureRead;

            // Update Cards
            document.getElementById('totalWorks').innerText = tWorks;
            document.getElementById('totalVolumes').innerText = tVols;
            const readPct = tVols > 0 ? Math.round((tRead/tVols)*100) : 0;
            document.getElementById('readStats').innerText = \`\${readPct}% Letti (\${tRead}/\${tVols}) — Globale: \${globalReadVolumes}\`;
            document.getElementById('totalCost').innerText = '€ ' + tCost.toFixed(2);
            document.getElementById('avgCost').innerText = 'Media € ' + (tVols>0?tCost/tVols:0).toFixed(2) + ' / vol';

            // Prepare Chart Data
            const sortD = (obj) => Object.entries(obj).sort((a,b)=>b[1]-a[1]);
            const dStatus = sortD(breakdown.status);
            const dPubCost = sortD(breakdown.pubCost);
            const dCostRange = Object.entries(breakdown.costRange);
            const dTargetSeries = sortD(breakdown.targetSeries);
            const dPubSeries = sortD(breakdown.pubSeries);
            const dTargetVol = sortD(breakdown.targetVol);
            const dPubVol = sortD(breakdown.pubVol);

            // Render Charts
            const chartCfg = (type, data, colors, isHz=false, isMoney=false) => ({
                type,
                data: {
                    labels: data.map(d=>d[0]),
                    datasets: [{ data: data.map(d=>d[1]), backgroundColor: colors, borderRadius: 4, borderWidth:0 }]
                },
                options: {
                    indexAxis: isHz?'y':'x', responsive:true, maintainAspectRatio:false,
                    plugins: { 
                        legend: { display: type==='doughnut', position:'right' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let valText = context.raw;
                                    if (isMoney) valText += '€';
                                    let labelStr = String(valText);
                                    if (type === 'doughnut' || (type === 'bar' && (isHz || !isMoney))) {
                                        let total;
                                        if (type === 'doughnut') {
                                            total = context.chart._metasets[context.datasetIndex].total;
                                        } else {
                                            total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        }
                                        if (total > 0) {
                                            const percentage = Math.round((context.raw / total) * 100) + '%';
                                            labelStr += ' (' + percentage + ')';
                                        }
                                    }
                                    return labelStr;
                                }
                            }
                        }
                    },
                    scales: type==='doughnut'?{}:{ 
                        x:{
                            grid:{display:false},
                            ticks:{
                                color:COLORS.secondaryText,
                                ...(type === 'bar' && !isHz ? { maxRotation: 0, minRotation: 0, autoSkip: false, font: { size: 10 } } : {})
                            }
                        }, 
                        y:{
                            grid:{color:COLORS.border},
                            ticks:{color:COLORS.secondaryText, callback: isMoney?v=>'€'+v:v=>v}
                        } 
                    }
                }
            });

            const draw = (id, cfg) => { if(charts[id]) charts[id].destroy(); charts[id] = new Chart(document.getElementById(id), cfg); };
            
            draw('statusChart', chartCfg('doughnut', dStatus, dStatus.map(d=>getStatusColor(d[0]))));
            draw('publisherCostChart', chartCfg('bar', dPubCost, dPubCost.map(d=>getPublisherColor(d[0])), false, true));
            draw('priceRangeChart', chartCfg('bar', dCostRange, ['#4DB6AC']));
            draw('targetSeriesChart', chartCfg('doughnut', dTargetSeries, dTargetSeries.map(d=>getTargetColor(d[0]))));
            draw('publisherSeriesChart', chartCfg('bar', dPubSeries, dPubSeries.map(d=>getPublisherColor(d[0])), false));
            draw('targetVolumeChart', chartCfg('doughnut', dTargetVol, dTargetVol.map(d=>getTargetColor(d[0]))));
            draw('publisherVolumeChart', chartCfg('bar', dPubVol, dPubVol.map(d=>getPublisherColor(d[0])), false));

            // Setup scrolling for charts
            const setScrollableWidth = (id, length) => {
                const el = document.getElementById(id).parentElement;
                if (length > 4) {
                    el.style.minWidth = (length * 80) + 'px';
                }
            };
            setScrollableWidth('publisherCostChart', dPubCost.length);
            setScrollableWidth('publisherSeriesChart', dPubSeries.length);
            setScrollableWidth('publisherVolumeChart', dPubVol.length);

            // Render Lists
            renderList('statusList', dStatus);
            renderList('publisherCostList', dPubCost, true);
            renderList('priceRangeList', dCostRange);
            renderList('targetSeriesList', dTargetSeries);
            renderList('publisherSeriesList', dPubSeries);
            renderList('targetVolumeList', dTargetVol);
            renderList('publisherVolumeList', dPubVol);
        }

        // --- FILTERED GROWTH STATS ---
        function updateGrowthStats() {
            const growthData = {}; 
            const costGrowthData = {};
            const readGrowthData = {};
            let periodVols = 0;

            RAW_DATA.forEach(m => {
                if(m.volumes) m.volumes.forEach(v => {
                    const vDate = v.dateAdded ? new Date(v.dateAdded) : (m.dateAdded ? new Date(m.dateAdded) : null);
                    if(vDate) {
                        const y = vDate.getFullYear();
                        const mo = vDate.getMonth() + 1;

                        let inPeriod = false;
                        if (selectedYear === 'all') inPeriod = true;
                        else if (y == selectedYear && (selectedMonth === 'all' || mo == selectedMonth)) inPeriod = true;

                        if(inPeriod) {
                            periodVols++;
                            const key = selectedMonth !== 'all' ? vDate.getDate() : \`\${y}-\${String(mo).padStart(2,'0')}\`;
                            growthData[key] = (growthData[key] || 0) + 1;
                            const p = parseFloat(v.price);
                            if(!isNaN(p)) costGrowthData[key] = (costGrowthData[key] || 0) + p;
                        }
                    }
                });
            });

            // 2. Reading Growth from both
            [...RAW_DATA, ...RAW_LETTURE].forEach(m => {
                if (m.volumes) m.volumes.forEach(v => {
                    if(v.read && v.readDate) {
                        const rDate = new Date(v.readDate);
                        if(!isNaN(rDate.getTime())) {
                            const y = rDate.getFullYear();
                            const mo = rDate.getMonth() + 1;
                            
                            let inPeriod = false;
                            if (selectedYear === 'all') inPeriod = true;
                            else if (y == selectedYear && (selectedMonth === 'all' || mo == selectedMonth)) inPeriod = true;
                            
                            if (inPeriod) {
                                const key = selectedMonth !== 'all' ? rDate.getDate() : \`\${y}-\${String(mo).padStart(2,'0')}\`;
                                readGrowthData[key] = (readGrowthData[key] || 0) + 1;
                            }
                        }
                    }
                });
            });

            // Title Update
            document.getElementById('growthTitle').innerHTML = \`Crescita Collezione <span style="font-weight:normal; font-size:12px; margin-left:auto; color:var(--text-secondary)">+\${periodVols} volumi nel periodo</span>\`;
            
            let periodReadVols = 0;
            Object.values(readGrowthData).forEach(v => periodReadVols += v);
            document.getElementById('readGrowthTitle').innerHTML = \`Volumi Letti nel Tempo <span style="font-weight:normal; font-size:12px; margin-left:auto; color:var(--text-secondary)">Totale: \${periodReadVols}</span>\`;

            // Sort & Aggregate
            const sortedKeys = Object.keys(growthData).sort((a,b) => {
                if(selectedMonth !== 'all') return parseInt(a)-parseInt(b);
                return a.localeCompare(b);
            });
            const volData = sortedKeys.map(k => ({ label: k, value: growthData[k] }));
            
            let cumVol = 0;
            const cumVolData = sortedKeys.map(k => { cumVol += growthData[k]; return { label: k, value: cumVol }; });
            
            let cumCost = 0;
            const cumCostData = sortedKeys.map(k => { cumCost += (costGrowthData[k]||0); return { label: k, value: cumCost }; });
            
            const sortedReadKeys = Object.keys(readGrowthData).sort((a,b) => {
                if(selectedMonth !== 'all') return parseInt(a)-parseInt(b);
                return a.localeCompare(b);
            });
            const readData = sortedReadKeys.map(k => ({ label: k, value: readGrowthData[k] }));

            // Charts
            const lineCfg = (label, dataArr, color, isMoney=false) => ({
                type: 'line',
                data: {
                    labels: dataArr.map(d=>d.label),
                    datasets: [{ label, data: dataArr.map(d=>d.value), borderColor: color, backgroundColor: color+'33', fill: true, tension: 0.4, pointRadius: 3 }]
                },
                options: {
                    responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
                    scales: { x:{grid:{display:false},ticks:{color:COLORS.secondaryText}}, y:{beginAtZero:true, grid:{color:COLORS.border}, ticks:{color:COLORS.secondaryText, callback: isMoney?v=>'€'+v:v=>v}} }
                }
            });

            const draw = (id, cfg) => { if(charts[id]) charts[id].destroy(); charts[id] = new Chart(document.getElementById(id), cfg); };
            
            draw('growthChart', lineCfg('Volumi', volData, '#764ba2'));
            draw('totalVolumeGrowthChart', lineCfg('Totale Volumi', cumVolData, '#1e88e5'));
            draw('costGrowthChart', lineCfg('Spesa Cumulativa', cumCostData, '#26A69A', true));
            draw('readGrowthChart', lineCfg('Volumi Letti', readData, '#FF7043'));

            // Lists
            renderList('growthList', volData);
            renderList('totalVolumeGrowthList', cumVolData);
            renderList('costGrowthList', cumCostData, true);
            renderList('readGrowthList', readData);
        }
    </script>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MangaBox_Export_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
