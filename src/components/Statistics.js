import { h } from 'preact';
import { useEffect, useRef, useState, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import Chart from 'chart.js/auto';
import { generateHTML } from '../utils/htmlExport.js';

// Helper Components defined OUTSIDE to prevent re-creation on render
const TimeSelector = ({ selectedYear, onYearChange, selectedMonth, onMonthChange, availableYears, openDropdown, setOpenDropdown }) => {
  const months = [
    { value: 'all', label: 'Tutti i mesi' },
    { value: '1', label: 'Gennaio' },
    { value: '2', label: 'Febbraio' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Aprile' },
    { value: '5', label: 'Maggio' },
    { value: '6', label: 'Giugno' },
    { value: '7', label: 'Luglio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Settembre' },
    { value: '10', label: 'Ottobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Dicembre' }
  ];

  const yearsOptions = [{ value: 'all', label: 'Tutto' }, ...availableYears.map(y => ({ value: y, label: y }))];

  return html`
    <div style="margin-bottom: 24px; display: flex; justify-content: flex-end; align-items: center; gap: 16px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <label style="color: var(--secondary-text-color); font-size: 13px; font-weight: 500;">Anno:</label>
        <div class="custom-select-container" style="width: 120px;">
          <div 
            class="custom-select-trigger" 
            tabIndex="0"
            onClick=${() => setOpenDropdown(openDropdown === 'year' ? null : 'year')}
            onKeyDown=${(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                const idx = yearsOptions.findIndex(o => o.value.toString() === selectedYear);
                const next = yearsOptions[(idx + 1) % yearsOptions.length];
                onYearChange(next.value.toString());
                if (next.value === 'all') onMonthChange('all');
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const idx = yearsOptions.findIndex(o => o.value.toString() === selectedYear);
                const next = yearsOptions[(idx - 1 + yearsOptions.length) % yearsOptions.length];
                onYearChange(next.value.toString());
                if (next.value === 'all') onMonthChange('all');
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpenDropdown(openDropdown === 'year' ? null : 'year');
              } else if (e.key === 'Escape') {
                setOpenDropdown(null);
              }
            }}
            style="padding: 8px 12px; font-size: 13px; background: var(--surface-color);"
          >
            <span>${selectedYear === 'all' ? 'Tutto' : selectedYear}</span>
            <svg style="transform: ${openDropdown === 'year' ? 'rotate(180deg)' : 'rotate(0)'}; transition: transform 0.2s;" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          ${openDropdown === 'year' && html`
            <div class="custom-select-options">
              ${yearsOptions.map(opt => html`
                <div 
                  class="custom-select-option ${selectedYear === opt.value.toString() ? 'selected' : ''}"
                  onClick=${() => { onYearChange(opt.value.toString()); if (opt.value === 'all') onMonthChange('all'); setOpenDropdown(null); }}
                >
                  ${opt.label}
                </div>
              `)}
            </div>
          `}
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 12px; opacity: ${selectedYear === 'all' ? '0.4' : '1'}; pointer-events: ${selectedYear === 'all' ? 'none' : 'auto'}; transition: all 0.2s;">
        <label style="color: var(--secondary-text-color); font-size: 13px; font-weight: 500;">Mese:</label>
        <div class="custom-select-container" style="width: 160px;">
          <div 
            class="custom-select-trigger" 
            tabIndex="0"
            onClick=${() => setOpenDropdown(openDropdown === 'month' ? null : 'month')}
            onKeyDown=${(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                const idx = months.findIndex(m => m.value === selectedMonth.toString());
                const next = months[(idx + 1) % months.length];
                onMonthChange(next.value);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const idx = months.findIndex(m => m.value === selectedMonth.toString());
                const next = months[(idx - 1 + months.length) % months.length];
                onMonthChange(next.value);
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpenDropdown(openDropdown === 'month' ? null : 'month');
              } else if (e.key === 'Escape') {
                setOpenDropdown(null);
              }
            }}
            style="padding: 8px 12px; font-size: 13px; background: var(--surface-color);"
          >
            <span>${months.find(m => m.value === selectedMonth.toString())?.label || 'Tutti i mesi'}</span>
            <svg style="transform: ${openDropdown === 'month' ? 'rotate(180deg)' : 'rotate(0)'}; transition: transform 0.2s;" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          ${openDropdown === 'month' && html`
            <div class="custom-select-options">
              ${months.map(m => html`
                <div 
                  class="custom-select-option ${selectedMonth === m.value ? 'selected' : ''}"
                  onClick=${() => { onMonthChange(m.value); setOpenDropdown(null); }}
                >
                  ${m.label}
                </div>
              `)}
            </div>
          `}
        </div>
      </div>
    </div>
  `;
};

const StatCard = ({ title, value, subtext, icon }) => html`
  <div class="animate-slide-up" style="background: var(--surface-color); padding: 20px; border-radius: 16px; flex: 1; min-width: 160px; display: flex; flex-direction: column; position: relative; overflow: hidden; border: 1px solid var(--border-color);">
    <div style="position: absolute; top: -10px; right: -10px; font-size: 60px; opacity: 0.05; transform: rotate(15deg);">${icon}</div>
    <div style="font-size: 13px; color: var(--secondary-text-color); margin-bottom: 8px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">${title}</div>
    <div style="font-size: 28px; font-weight: bold; color: var(--text-color);">${value}</div>
    ${subtext ? html`<div style="font-size: 12px; color: var(--primary-color); margin-top: 6px; font-weight: 500;">${subtext}</div>` : null}
  </div>
`;

const ChartCard = ({ title, canvasRef, wide, scrollDirection, itemCount = 0 }) => {
  let minWidth = '100%';
  let minHeight = '100%';
  
  if (scrollDirection === 'x' && itemCount > 4) {
    // 4 visualizzati contemporaneamente (es. 25% della larghezza necessaria per elemento se fossero 4)
    minWidth = `${itemCount * 80}px`;
  } else if (scrollDirection === 'y' && itemCount > 4) {
    minHeight = `${itemCount * 40}px`;
  }
  
  return html`
  <div class="animate-slide-up" style="background: var(--surface-color); border-radius: 16px; padding: 20px; ${scrollDirection ? (scrollDirection === 'y' ? 'height: 400px;' : 'min-height: 300px;') : 'min-height: 300px;'} display: flex; flex-direction: column; border: 1px solid var(--border-color); grid-column: ${wide ? 'span 2' : 'span 1'};">
    <div style="font-weight: bold; font-size: 16px; margin-bottom: 16px; color: var(--text-color); display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
      <div style="width: 4px; height: 16px; background: var(--primary-color); border-radius: 2px;"></div>
      ${title}
    </div>
    <div class="custom-chart-scrollbar" style="flex: 1; position: relative; width: 100%; overflow-x: ${scrollDirection === 'x' ? 'auto' : 'hidden'}; overflow-y: ${scrollDirection === 'y' ? 'auto' : 'hidden'}; padding-bottom: ${scrollDirection === 'x' ? '12px' : '0'};">
      <div style="position: relative; min-width: ${minWidth}; min-height: ${minHeight}; height: 100%;">
        <canvas ref=${canvasRef}></canvas>
      </div>
    </div>
  </div>
`;
};

export default function Statistics({ mangaList = [], lettureList = [], settings }) {
  const statusChartRef = useRef(null);
  const targetSeriesChartRef = useRef(null);
  const targetVolumeChartRef = useRef(null);
  const publisherSeriesChartRef = useRef(null);
  const publisherVolumeChartRef = useRef(null);
  const publisherCostChartRef = useRef(null);
  const costChartRef = useRef(null);
  const growthChartRef = useRef(null);
  const readGrowthChartRef = useRef(null);
  const costGrowthChartRef = useRef(null);
  const totalVolumeGrowthRef = useRef(null);
  const charts = useRef({});
  const containerRef = useRef(null);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [openDropdown, setOpenDropdown] = useState(null); // 'year' or 'month' or null

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openDropdown && !e.target.closest('.custom-select-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Calculate available years
  // Calculate available years based on volumes from both lists
  const availableYears = [...new Set([...mangaList, ...lettureList]
    .flatMap(m => {
      const mangaDate = m.dateAdded ? new Date(m.dateAdded) : null;
      // Get dates for all volumes, fallback to manga date if volume date missing
      const volDates = (m.volumes || []).map(v => v.dateAdded ? new Date(v.dateAdded) : mangaDate);
      
      const readDates = (m.volumes || []).filter(v => v.read && v.readDate).map(v => new Date(v.readDate));
      return [...volDates, ...readDates];
    })
    .filter(d => d && !isNaN(d.getTime()))
    .map(d => d.getFullYear())
  )].sort((a, b) => b - a);

  // Fixed colors for top publishers to ensure consistency
  const publisherColorsMap = {
    'Planet Manga': '#D32F2F', // Red
    'Star Comics': '#1976D2', // Blue
    'J-pop': '#FBC02D', // Yellow/Orange
    'Panini Comics': '#D32F2F', // Red (same as Planet)
    'Goen': '#7B1FA2', // Purple
    'Dynit': '#00796B', // Teal
    'Magic Press': '#E64A19', // Deep Orange
    'FlashBook': '#388E3C', // Green
    'Bao Publishing': '#5D4037', // Brown
    'Coconino Press': '#F57C00', // Orange
    'Sconosciuto': '#616161' // Grey
  };

  const getPublisherColor = (name) => {
    return publisherColorsMap[name] || '#90A4AE'; // Default grey-blue
  };

  // Fixed colors for Status
  const statusColorsMap = {
    'Serie in corso': '#66BB6A', // Green 400
    'Serie completa': '#42A5F5', // Blue 400
    'Volume unico': '#FFCA28', // Amber 400
    'Pausa': '#FFA726', // Orange 400
    'Cancellata': '#EF5350', // Red 400
    'Sconosciuto': '#BDBDBD' // Grey 400
  };

  const getStatusColor = (name) => statusColorsMap[name] || '#BDBDBD';

  // Fixed colors for Target
  const targetColorsMap = {
    'Seinen': '#7E57C2', // Deep Purple
    'Shonen': '#FF7043', // Deep Orange
    'Shojo': '#F06292', // Pink
    'Josei': '#26A69A', // Teal (Changed from Purple to distinguish from Seinen)
    'Kodomo': '#D4E157', // Lime
    'Altro': '#78909C', // Blue Grey
    'Sconosciuto': '#BDBDBD' // Grey
  };

  const getTargetColor = (name) => targetColorsMap[name] || '#78909C';

  // Helper to calculate totals
  const totalWorks = mangaList.length;

  const totalVolumes = mangaList.reduce((acc, manga) => {
    return acc + (manga.volumes ? manga.volumes.length : 0);
  }, 0);

  const readVolumes = mangaList.reduce((acc, manga) => {
    if (!manga.volumes) return acc;
    return acc + manga.volumes.filter(v => v.read).length;
  }, 0);

  const lettureVolumes = lettureList.reduce((acc, manga) => {
    if (!manga.volumes) return acc;
    return acc + manga.volumes.filter(v => v.read).length;
  }, 0);

  const globalReadVolumes = readVolumes + lettureVolumes;

  const readPercentage = totalVolumes > 0 ? Math.round((readVolumes / totalVolumes) * 100) : 0;

  const totalCost = mangaList.reduce((acc, manga) => {
    if (!manga.volumes) return acc;
    return acc + manga.volumes.reduce((vAcc, vol) => {
      const price = parseFloat(vol.price);
      return vAcc + (isNaN(price) ? 0 : price);
    }, 0);
  }, 0);

  const avgCostPerVolume = totalVolumes > 0 ? (totalCost / totalVolumes) : 0;

  // Helper for breakdowns
  const getBreakdown = (key) => {
    const counts = {};
    mangaList.forEach(manga => {
      const val = manga[key] || 'Sconosciuto';
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const statusBreakdown = getBreakdown('status');
  const targetSeriesBreakdown = getBreakdown('target');
  const publisherSeriesBreakdown = getBreakdown('publisher');

  // Volume-based breakdowns
  const getVolumeBreakdown = (key) => {
    const counts = {};
    mangaList.forEach(manga => {
      const val = manga[key] || 'Sconosciuto';
      const volCount = manga.volumes ? manga.volumes.length : 0;
      counts[val] = (counts[val] || 0) + volCount;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const targetVolumeBreakdown = getVolumeBreakdown('target');
  const publisherVolumeBreakdown = getVolumeBreakdown('publisher');

  // Cost per Publisher breakdown
  const publisherCostBreakdown = (() => {
    const counts = {};
    mangaList.forEach(manga => {
      const pub = manga.publisher || 'Sconosciuto';
      const cost = manga.volumes ? manga.volumes.reduce((acc, v) => acc + (parseFloat(v.price) || 0), 0) : 0;
      counts[pub] = (counts[pub] || 0) + cost;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => [k, parseFloat(v.toFixed(2))]); // Ensure 2 decimal places
  })();

  const createChart = (canvasRef, id, type, label, data, customColors, isHorizontal = false) => {
    if (!canvasRef.current) return;

    // Destroy existing chart if any
    if (charts.current[id]) {
      charts.current[id].destroy();
      charts.current[id] = null;
    }

    // Determine colors based on data keys
    let backgroundColors = customColors;

    if (!backgroundColors) {
      if (id.includes('publisher') || id.includes('Publisher')) {
        backgroundColors = data.map(d => getPublisherColor(d[0]));
      } else if (id.includes('status')) {
        backgroundColors = data.map(d => getStatusColor(d[0]));
      } else if (id.includes('target')) {
        backgroundColors = data.map(d => getTargetColor(d[0]));
      } else {
        // Default fallback
        backgroundColors = [
          '#81C784', '#64B5F6', '#E57373', '#FFD54F', '#BA68C8', '#4DB6AC', '#90A4AE', '#A1887F'
        ];
      }
    }

    const getColor = (varName) => getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

    const ctx = canvasRef.current.getContext('2d');
    charts.current[id] = new Chart(ctx, {
      type: type,
      data: {
        labels: data.map(d => d[0]),
        datasets: [{
          label: label,
          data: data.map(d => d[1]),
          backgroundColor: backgroundColors,
          borderWidth: 0,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: isHorizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: id !== 'cost' && !id.includes('publisher'), // Hide legend for cost and publisher charts
            position: type === 'doughnut' ? 'right' : 'top',
            labels: { color: getColor('--secondary-text-color'), boxWidth: 12, font: { size: 10 } }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let valText = context.raw;
                if (id.toLowerCase().includes('cost') || id.includes('prezzo')) {
                   valText += '€';
                }
                let labelStr = String(valText);

                // Add percentage for Doughnut charts or if requested
                if (type === 'doughnut' || id.includes('publisher')) {
                  // For bar charts, we need to calculate the total manually or use the passed total
                  let total;
                  if (type === 'doughnut') {
                    total = context.chart._metasets[context.datasetIndex].total;
                  } else {
                    // For bar charts (publisher cost/count), calculate sum of visible data
                    total = context.dataset.data.reduce((a, b) => a + b, 0);
                  }

                  if (total > 0) {
                    const percentage = Math.round((context.raw / total) * 100) + '%';
                    labelStr += ` (${percentage})`;
                  }
                }
                return labelStr;
              }
            }
          }
        },
        scales: type === 'bar' ? {
          y: {
            beginAtZero: true,
            grid: { color: getColor('--border-color') },
            ticks: { color: getColor('--secondary-text-color') }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: getColor('--secondary-text-color'),
              maxRotation: 0, // Prevent rotation
              minRotation: 0,
              autoSkip: false, // Force show all labels
              font: {
                size: 10 // Reduce font size to fit
              }
            }
          }
        } : {}
      }
    });
  };

  useEffect(() => {
    // Helper to get theme colors
    const getColor = (varName) => getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

    // Mobile detection
    const isMobile = window.innerWidth < 768;

    createChart(statusChartRef, 'status', 'doughnut', 'Stato Serie', statusBreakdown);
    createChart(publisherCostChartRef, 'publisherCost', 'bar', 'Spesa per Editore (€)', publisherCostBreakdown);
    createChart(targetSeriesChartRef, 'targetSeries', 'doughnut', 'Target (Serie)', targetSeriesBreakdown);
    createChart(targetVolumeChartRef, 'targetVolume', 'doughnut', 'Target (Volumi)', targetVolumeBreakdown);

    // Keep vertical bars even on mobile as requested
    createChart(publisherSeriesChartRef, 'publisherSeries', 'bar', 'Editore per Serie', publisherSeriesBreakdown, null, false);
    createChart(publisherVolumeChartRef, 'publisherVolume', 'bar', 'Editore per Volume', publisherVolumeBreakdown, null, false);

    // Cost distribution (exclusive ranges)
    const costRanges = { '0-4.99€': 0, '5-9.99€': 0, '10-14.99€': 0, '15€+': 0 };
    mangaList.forEach(m => {
      if (m.volumes) m.volumes.forEach(v => {
        const p = parseFloat(v.price);
        if (!isNaN(p)) {
          if (p < 5) costRanges['0-4.99€']++;
          else if (p < 10) costRanges['5-9.99€']++;
          else if (p < 15) costRanges['10-14.99€']++;
          else costRanges['15€+']++;
        }
      });
    });
    createChart(costChartRef, 'cost', 'bar', 'Fascia Prezzo Volumi', Object.entries(costRanges), ['#4DB6AC']);

    // Growth Charts Logic Moved to useMemo below
  }, [mangaList, settings?.theme]); // Removed date dependencies as they are handled below

  // Calculate Growth Data outside useEffect to be available for render
  const { sortedGrowth, sortedCostGrowth, sortedReadGrowth, cumulativeVolumeData, cumulativeCostData, totalVolumesInPeriod, totalReadInPeriod } = useMemo(() => {
    const growthData = {};
    const costGrowthData = {};
    const readGrowthData = {};

    // 1. Collection Growth & Cost from library only
    mangaList.forEach(m => {
      const mangaDateStr = m.dateAdded;

      if (m.volumes) {
        m.volumes.forEach(vol => {
          // 1. Collection Growth & Cost (Based on addition date)
          let dateStr = vol.dateAdded || mangaDateStr;
          if (dateStr) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              if ((selectedYear === 'all' || year === parseInt(selectedYear)) &&
                (selectedMonth === 'all' || (date.getMonth() + 1) === parseInt(selectedMonth))) {

                const key = selectedMonth !== 'all'
                  ? `${date.getDate()}`
                  : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                growthData[key] = (growthData[key] || 0) + 1;

                const cost = parseFloat(vol.price);
                const validCost = isNaN(cost) ? 0 : cost;
                costGrowthData[key] = (costGrowthData[key] || 0) + validCost;
              }
            }
          }
        });
      }
    });

    // 2. Reading Growth from both library and letture
    [...mangaList, ...lettureList].forEach(m => {
      if (m.volumes) {
        m.volumes.forEach(vol => {
          if (vol.read && vol.readDate) {
            const readDate = new Date(vol.readDate);
            if (!isNaN(readDate.getTime())) {
              const rYear = readDate.getFullYear();
              if ((selectedYear === 'all' || rYear === parseInt(selectedYear)) &&
                (selectedMonth === 'all' || (readDate.getMonth() + 1) === parseInt(selectedMonth))) {

                const key = selectedMonth !== 'all'
                  ? `${readDate.getDate()}`
                  : `${readDate.getFullYear()}-${String(readDate.getMonth() + 1).padStart(2, '0')}`;
                readGrowthData[key] = (readGrowthData[key] || 0) + 1;
              }
            }
          }
        });
      }
    });

    // Sort by date/day
    const sortFn = (a, b) => {
      if (selectedMonth !== 'all') {
        return parseInt(a[0]) - parseInt(b[0]);
      }
      return a[0].localeCompare(b[0]);
    };

    const sortedGrowth = Object.entries(growthData).sort(sortFn);
    const sortedCostGrowth = Object.entries(costGrowthData).sort(sortFn);
    const sortedReadGrowth = Object.entries(readGrowthData).sort(sortFn);

    // Calculate cumulative
    let cumulativeCost = 0;
    const cumulativeCostData = sortedCostGrowth.map(([date, cost]) => {
      cumulativeCost += cost;
      return [date, cumulativeCost];
    });

    let cumulativeVolumes = 0;
    const cumulativeVolumeData = sortedGrowth.map(([date, count]) => {
      cumulativeVolumes += count;
      return [date, cumulativeVolumes];
    });

    const totalVolumesInPeriod = sortedGrowth.reduce((acc, curr) => acc + curr[1], 0);
    const totalReadInPeriod = sortedReadGrowth.reduce((acc, curr) => acc + curr[1], 0);

    return { sortedGrowth, sortedCostGrowth, sortedReadGrowth, cumulativeVolumeData, cumulativeCostData, totalVolumesInPeriod, totalReadInPeriod };
  }, [mangaList, lettureList, selectedYear, selectedMonth]);

  // Effect to render Growth Charts using the memoized data
  useEffect(() => {
    const getColor = (varName) => getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

    if (charts.current['growth']) {
      charts.current['growth'].destroy();
      charts.current['growth'] = null;
    }
    if (charts.current['costGrowth']) {
      charts.current['costGrowth'].destroy();
      charts.current['costGrowth'] = null;
    }
    if (charts.current['totalVolumeGrowth']) {
      charts.current['totalVolumeGrowth'].destroy();
      charts.current['totalVolumeGrowth'] = null;
    }

    // Render Volume Growth Chart
    if (growthChartRef.current) {
      if (sortedGrowth.length > 0) {
        const ctx = growthChartRef.current.getContext('2d');
        charts.current['growth'] = new Chart(ctx, {
          type: 'line',
          data: {
            labels: sortedGrowth.map(d => d[0]),
            datasets: [{
              label: 'Volumi Aggiunti',
              data: sortedGrowth.map(d => d[1]),
              borderColor: '#764ba2',
              backgroundColor: 'rgba(118, 75, 162, 0.2)',
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, grid: { color: getColor('--border-color') }, ticks: { color: getColor('--secondary-text-color') } },
              x: { grid: { display: false }, ticks: { color: getColor('--secondary-text-color') } }
            }
          }
        });
      }
    }

    // Render Cumulative Volume Growth Chart
    if (totalVolumeGrowthRef.current) {
      if (cumulativeVolumeData.length > 0) {
        const ctx = totalVolumeGrowthRef.current.getContext('2d');
        charts.current['totalVolumeGrowth'] = new Chart(ctx, {
          type: 'line',
          data: {
            labels: cumulativeVolumeData.map(d => d[0]),
            datasets: [{
              label: 'Volumi Totali',
              data: cumulativeVolumeData.map(d => d[1]),
              borderColor: '#1e88e5', // Blue 600
              backgroundColor: 'rgba(30, 136, 229, 0.2)',
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: getColor('--border-color') },
                ticks: { color: getColor('--secondary-text-color') }
              },
              x: { grid: { display: false }, ticks: { color: getColor('--secondary-text-color') } }
            }
          }
        });
      }
    }

    // Render Cost Growth Chart
    if (costGrowthChartRef.current) {
      if (cumulativeCostData.length > 0) {
        const ctx = costGrowthChartRef.current.getContext('2d');
        charts.current['costGrowth'] = new Chart(ctx, {
          type: 'line',
          data: {
            labels: cumulativeCostData.map(d => d[0]),
            datasets: [{
              label: 'Spesa Cumulativa (€)',
              data: cumulativeCostData.map(d => d[1]),
              borderColor: '#26A69A', // Teal
              backgroundColor: 'rgba(38, 166, 154, 0.2)',
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: getColor('--border-color') },
                ticks: { color: getColor('--secondary-text-color'), callback: (value) => '€' + value }
              },
              x: { grid: { display: false }, ticks: { color: getColor('--secondary-text-color') } }
            }
          }
        });
      }
    }

    // Render Read Growth Chart
    if (readGrowthChartRef.current) {
      if (sortedReadGrowth.length > 0) {
        const ctx = readGrowthChartRef.current.getContext('2d');
        charts.current['readGrowth'] = new Chart(ctx, {
          type: 'line', // Trend is better visualized as line or bar? Line suggests continuity. Bar suggests count per period. "Growth" usually cumulative, but here it's "Read in this period". Bar might be better for "How many read in Jan". Line for "Trend".
          // Let's us Bar for "Volumes Read Per Month/Day" as it's cleaner for discreet activity.
          // Wait, other charts are Lines (Growth = Added).
          // Let's use Line to match style, or Bar if it looks sparse.
          // The request was "andamento", trend. Line is fine.
          type: 'line',
          data: {
            labels: sortedReadGrowth.map(d => d[0]),
            datasets: [{
              label: 'Volumi Letti',
              data: sortedReadGrowth.map(d => d[1]),
              borderColor: '#FF7043', // Deep Orange
              backgroundColor: 'rgba(255, 112, 67, 0.2)',
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, grid: { color: getColor('--border-color') }, ticks: { color: getColor('--secondary-text-color') } },
              x: { grid: { display: false }, ticks: { color: getColor('--secondary-text-color') } }
            }
          }
        });
      }
    }

    return () => {
      ['growth', 'costGrowth', 'totalVolumeGrowth', 'readGrowth'].forEach(key => {
        if (charts.current[key]) {
          charts.current[key].destroy();
          charts.current[key] = null;
        }
      });
    };
  }, [sortedGrowth, sortedCostGrowth, sortedReadGrowth, cumulativeVolumeData, cumulativeCostData]); // Depend on calculated data

  const isMobileView = window.innerWidth < 768;

  return html`
    <div ref=${containerRef} class="container" style="padding: 24px; padding-bottom: 100px; max-width: 1200px; margin: 0 auto; background: var(--background-color);">
      <style>
        .custom-chart-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: var(--primary-color) rgba(0, 0, 0, 0.1);
        }
        .custom-chart-scrollbar::-webkit-scrollbar {
            height: 8px;
            width: 8px;
        }
        .custom-chart-scrollbar::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 10px;
        }
        .custom-chart-scrollbar::-webkit-scrollbar-thumb {
            background-color: var(--primary-color);
            border-radius: 10px;
            border: 2px solid var(--surface-color);
        }
      </style>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2 class="view-title" style="margin: 0;">${settings?.nickname ? `Statistiche di ${settings.nickname}` : 'Statistiche Libreria'}</h2>
        <button 
          onClick=${() => generateHTML(mangaList, lettureList, settings?.theme, settings?.nickname)}
          style="
            background: var(--surface-color); 
            color: var(--primary-color); 
            border: 1px solid var(--primary-color); 
            padding: 8px 16px; 
            border-radius: 12px; 
            cursor: pointer; 
            font-size: 13px; 
            display: flex; 
            align-items: center; 
            gap: 8px;
            transition: all 0.2s;
          "
          onMouseEnter=${e => e.target.style.background = 'var(--hover-bg-color)'}
          onMouseLeave=${e => e.target.style.background = 'var(--item-bg-color)'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 96 960 960" width="18" fill="currentColor"><path d="M240 896q-33 0-56.5-23.5T160 816V256q0-33 23.5-56.5T240 176h320l240 240v400q0 33-23.5 56.5T720 896H240Zm280-520V256H240v560h480V376H520ZM240 256v120-120 560-560Z"/></svg>
          Esporta HTML
        </button>
      </div>
      
      <!-- Main Stats Grid -->
      <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
        <${StatCard} title="Opere Totali" value="${totalWorks}" icon="📚" />
        <${StatCard} title="Volumi Totali" value="${totalVolumes}" subtext="${readPercentage}% Letti (${readVolumes}/${totalVolumes}) — Globale: ${globalReadVolumes}" icon="📖" />
        <${StatCard} title="Spesa Totale" value="€ ${totalCost.toFixed(2)}" subtext="Media € ${avgCostPerVolume.toFixed(2)} / vol" icon="💰" />
      </div>

      <!-- Charts Grid -->
      <div style="display: flex; flex-direction: column; gap: 24px;">
        
        <!-- Row 1: Status, Cost per Publisher, Price Ranges -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
          <${ChartCard} title="Stato Serie" canvasRef=${statusChartRef} />
          <${ChartCard} title="Spesa per Editore" canvasRef=${publisherCostChartRef} scrollDirection="x" itemCount=${publisherCostBreakdown.length} />
          <${ChartCard} title="Fasce di prezzo per volumi" canvasRef=${costChartRef} />
        </div>

        <!-- Row 2: Series Metrics -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
          <${ChartCard} title="Target per Serie" canvasRef=${targetSeriesChartRef} />
          <${ChartCard} title="Editori per Serie" canvasRef=${publisherSeriesChartRef} wide=${true} scrollDirection="x" itemCount=${publisherSeriesBreakdown.length} />
        </div>

        <!-- Row 3: Volume Metrics -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
          <${ChartCard} title="Target per Volume" canvasRef=${targetVolumeChartRef} />
          <${ChartCard} title="Editori per Volume" canvasRef=${publisherVolumeChartRef} wide=${true} scrollDirection="x" itemCount=${publisherVolumeBreakdown.length} />
        </div>

        <!-- Row 4: Growth Charts -->
        <div>
          <${TimeSelector} 
            selectedYear=${selectedYear} 
            onYearChange=${setSelectedYear} 
            selectedMonth=${selectedMonth}
            onMonthChange=${setSelectedMonth}
            availableYears=${availableYears} 
            openDropdown=${openDropdown}
            setOpenDropdown=${setOpenDropdown}
          />
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 16px;">
            <div class="animate-slide-up" style="background: var(--surface-color); border-radius: 16px; padding: 20px; min-height: 300px; display: flex; flex-direction: column; border: 1px solid var(--border-color); grid-column: span 1;">
              <div style="font-weight: bold; font-size: 16px; margin-bottom: 16px; color: var(--text-color); display: flex; align-items: center; gap: 8px;">
                  <div style="width: 4px; height: 16px; background: #1e88e5; border-radius: 2px;"></div>
                  Andamento Volumi Totali
              </div>
              <div style="flex: 1; position: relative; width: 100%;">
                  <canvas ref=${totalVolumeGrowthRef}></canvas>
              </div>
            </div>

            <div class="animate-slide-up" style="background: var(--surface-color); border-radius: 16px; padding: 20px; min-height: 300px; display: flex; flex-direction: column; border: 1px solid var(--border-color); grid-column: ${window.innerWidth < 768 ? 'span 1' : 'span 2'};">
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 16px; color: var(--text-color); display: flex; align-items: center; gap: 8px;">
                    <div style="width: 4px; height: 16px; background: #764ba2; border-radius: 2px;"></div>
                    Crescita Collezione (Volumi) ${selectedYear !== 'all' || selectedMonth !== 'all' ? html`<span style="margin-left: auto; font-size: 14px; color: var(--secondary-text-color);">Totale: ${totalVolumesInPeriod}</span>` : ''}
                </div>
                <div style="flex: 1; position: relative; width: 100%;">
                    <canvas ref=${growthChartRef}></canvas>
                </div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
            <div class="animate-slide-up" style="background: var(--surface-color); border-radius: 16px; padding: 20px; min-height: 300px; display: flex; flex-direction: column; border: 1px solid var(--border-color); grid-column: span 1;">
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 16px; color: var(--text-color); display: flex; align-items: center; gap: 8px;">
                    <div style="width: 4px; height: 16px; background: #26A69A; border-radius: 2px;"></div>
                    Andamento Spesa Totale
                </div>
                <div style="flex: 1; position: relative; width: 100%;">
                    <canvas ref=${costGrowthChartRef}></canvas>
                </div>
            </div>

            <div class="animate-slide-up" style="background: var(--surface-color); border-radius: 16px; padding: 20px; min-height: 300px; display: flex; flex-direction: column; border: 1px solid var(--border-color); grid-column: ${window.innerWidth < 768 ? 'span 1' : 'span 2'};">
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 16px; color: var(--text-color); display: flex; align-items: center; gap: 8px;">
                    <div style="width: 4px; height: 16px; background: #FF7043; border-radius: 2px;"></div>
                    Volumi Letti nel Tempo ${html`<span style="margin-left: auto; font-size: 13px; color: var(--secondary-text-color);">Totale: ${totalReadInPeriod}${globalReadVolumes > totalReadInPeriod && selectedYear === 'all' && selectedMonth === 'all' ? html` <span title="${globalReadVolumes - totalReadInPeriod} volumi letti senza data di lettura registrata" style="color: var(--warning-color, #FFA726); cursor: help;">(${globalReadVolumes - totalReadInPeriod} senza data)</span>` : ''}</span>`}
                </div>
                <div style="flex: 1; position: relative; width: 100%;">
                    <canvas ref=${readGrowthChartRef}></canvas>
                </div>
            </div>
          </div>
      </div>
    </div>
  </div>
  `;
}
