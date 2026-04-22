import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, ScatterChart, Scatter, Cell } from 'recharts';
import { Activity, Heart, Thermometer, Droplets, Zap, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Shield, Brain, Waves, Target, Award, Bell, Clock, Settings, FileText, AlertCircle, Info, BarChart3, Download, RefreshCw, Share2, Menu, X, Home, BarChart as BarChartIcon, Compass, Gauge, Wind, GitBranch, Crosshair, Award as MedalIcon, Zap as PowerIcon, ReportIcon } from 'lucide-react';

const SoldierHealthDashboard = () => {
  const [data, setData] = useState([]);
  const [currentReading, setCurrentReading] = useState(null);
  const [healthStatus, setHealthStatus] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [riskScore, setRiskScore] = useState(0);
  const [healthScore, setHealthScore] = useState(100);
  const [trends, setTrends] = useState({});
  const [activePage, setActivePage] = useState('dashboard');
  const [timeRange, setTimeRange] = useState('all');
  const chartDataRef = useRef([]);
  const [historicalData, setHistoricalData] = useState({
    daily: [],
    weekly: [],
    monthly: []
  });
  const [criticalPopup, setCriticalPopup] = useState(null);
  const [showCriticalPopup, setShowCriticalPopup] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/17108uV0YYTj8pSIwZWnLgTyfa9DDzqs30A2td9Ssv7Y/export?format=csv';

  // Fetch data from Google Sheets
  const fetchSheetData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(GOOGLE_SHEETS_URL);
      const text = await response.text();
      const rows = text.split('\n').slice(1);
      
      const parsedData = rows
        .filter(row => row.trim())
        .map(row => {
          const cols = row.split(',');
          return {
            timestamp: cols[0]?.trim() || '',
            time: cols[1]?.trim() || '',
            heartRate: parseFloat(cols[2]) || 0,
            spo2: parseFloat(cols[3]) || 0,
            temperature: parseFloat(cols[4]) || 0,
            humidity: parseFloat(cols[5]) || 0,
            ecgVoltage: parseFloat(cols[6]) || 0,
          };
        })
        .filter(item => item.heartRate > 0);

      if (parsedData.length > 0) {
        setData(parsedData);
        const latest = parsedData[parsedData.length - 1];
        setCurrentReading(latest);
        performComprehensiveAnalysis(latest, parsedData);
        calculateHistoricalData(parsedData);
        setLastUpdate(new Date());
        chartDataRef.current = parsedData;
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLoading(false);
      createDemoData();
    }
  };

  const createDemoData = () => {
    const demoData = [];
    const now = new Date();
    for (let i = 0; i < 100; i++) {
      const time = new Date(now.getTime() - (100 - i) * 5000);
      demoData.push({
        timestamp: time.toISOString(),
        time: time.toLocaleTimeString(),
        heartRate: 70 + Math.sin(i / 10) * 15 + Math.random() * 10,
        spo2: 96 + Math.random() * 3,
        temperature: 29.5 + Math.random() * 0.8,
        humidity: 45 + Math.random() * 15,
        ecgVoltage: 1.5 + Math.random() * 1.5,
      });
    }
    setData(demoData);
    const latest = demoData[demoData.length - 1];
    setCurrentReading(latest);
    performComprehensiveAnalysis(latest, demoData);
    calculateHistoricalData(demoData);
    setLastUpdate(new Date());
    chartDataRef.current = demoData;
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSheetData();
    const interval = setInterval(fetchSheetData, 5000);
    return () => clearInterval(interval);
  }, []);

  const calculateHistoricalData = (allData) => {
    if (allData.length === 0) return;

    const hourlyData = {};
    allData.forEach(item => {
      const date = new Date(item.timestamp);
      const hourKey = `${date.getHours()}:00`;
      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = { time: hourKey, hr: [], spo2: [], temp: [], ecg: [], humidity: [] };
      }
      hourlyData[hourKey].hr.push(item.heartRate);
      hourlyData[hourKey].spo2.push(item.spo2);
      hourlyData[hourKey].temp.push(item.temperature);
      hourlyData[hourKey].ecg.push(item.ecgVoltage);
      hourlyData[hourKey].humidity.push(item.humidity);
    });

    const daily = Object.keys(hourlyData).map(key => ({
      time: key,
      avgHeartRate: (hourlyData[key].hr.reduce((a, b) => a + b, 0) / hourlyData[key].hr.length).toFixed(1),
      maxHeartRate: Math.max(...hourlyData[key].hr).toFixed(1),
      minHeartRate: Math.min(...hourlyData[key].hr).toFixed(1),
      avgSpO2: (hourlyData[key].spo2.reduce((a, b) => a + b, 0) / hourlyData[key].spo2.length).toFixed(1),
      avgTemp: (hourlyData[key].temp.reduce((a, b) => a + b, 0) / hourlyData[key].temp.length).toFixed(1),
      avgHumidity: (hourlyData[key].humidity.reduce((a, b) => a + b, 0) / hourlyData[key].humidity.length).toFixed(1),
      avgECG: (hourlyData[key].ecg.reduce((a, b) => a + b, 0) / hourlyData[key].ecg.length).toFixed(2),
      count: hourlyData[key].hr.length
    })).sort((a, b) => parseInt(a.time) - parseInt(b.time));

    setHistoricalData({
      daily,
      weekly: daily.slice(-168),
      monthly: daily.slice(-720)
    });
  };

  const performComprehensiveAnalysis = (current, history) => {
    const newAlerts = [];
    const status = {};
    let totalRisk = 0;
    let healthPoints = 100;

    const hrStatus = analyzeHeartRate(current.heartRate);
    status.heartRate = hrStatus;
    if (hrStatus.level !== 'normal') {
      newAlerts.push({
        type: hrStatus.level === 'critical' ? 'danger' : 'warning',
        message: hrStatus.message,
        metric: 'Heart Rate',
        value: current.heartRate.toFixed(0) + ' bpm',
        recommendation: hrStatus.recommendation,
        severity: hrStatus.severity,
        time: new Date().toLocaleTimeString()
      });
      totalRisk += hrStatus.riskPoints;
      healthPoints -= hrStatus.healthDeduction;
    }

    const spo2Status = analyzeSpO2(current.spo2);
    status.spo2 = spo2Status;
    if (spo2Status.level !== 'normal') {
      newAlerts.push({
        type: spo2Status.level === 'critical' ? 'danger' : 'warning',
        message: spo2Status.message,
        metric: 'SpO2',
        value: current.spo2.toFixed(1) + '%',
        recommendation: spo2Status.recommendation,
        severity: spo2Status.severity,
        time: new Date().toLocaleTimeString()
      });
      totalRisk += spo2Status.riskPoints;
      healthPoints -= spo2Status.healthDeduction;
    }

    const tempStatus = analyzeTemperature(current.temperature);
    status.temperature = tempStatus;
    if (tempStatus.level !== 'normal') {
      newAlerts.push({
        type: tempStatus.level === 'critical' ? 'danger' : 'warning',
        message: tempStatus.message,
        metric: 'Temperature',
        value: current.temperature.toFixed(1) + '°C',
        recommendation: tempStatus.recommendation,
        severity: tempStatus.severity,
        time: new Date().toLocaleTimeString()
      });
      totalRisk += tempStatus.riskPoints;
      healthPoints -= tempStatus.healthDeduction;
    }

    if (history.length >= 10) {
      const hrvAnalysis = analyzeHRV(history);
      status.hrv = hrvAnalysis;
      
      const trendAnalysis = analyzeTrends(history);
      setTrends(trendAnalysis);

      const stressAnalysis = analyzeStressLevel(history);
      if (stressAnalysis.level !== 'normal') {
        newAlerts.push({
          type: 'info',
          message: stressAnalysis.message,
          metric: 'Stress Level',
          value: stressAnalysis.level,
          recommendation: stressAnalysis.recommendation,
          severity: 2,
          time: new Date().toLocaleTimeString()
        });
      }
    }

    const criticalAlerts = newAlerts.filter(alert => alert.type === 'danger');
    if (criticalAlerts.length > 0 && criticalAlerts[0]) {
      setCriticalPopup(criticalAlerts[0]);
      setShowCriticalPopup(true);
      
      setTimeout(() => {
        setShowCriticalPopup(false);
      }, 5000);
    }

    setAlerts(newAlerts.slice(0, 10));
    setHealthStatus(status);
    setRiskScore(Math.min(totalRisk, 100));
    setHealthScore(Math.max(healthPoints, 0));
  };

const analyzeHeartRate = (hr) => {
  if (hr < 40) return { level: 'critical', message: 'Severe Bradycardia Detected', recommendation: 'Immediate medical attention required', riskPoints: 40, healthDeduction: 30, severity: 5 };
  if (hr < 60) return { level: 'warning', message: 'Bradycardia - Low Heart Rate', recommendation: 'Monitor closely, consult physician', riskPoints: 15, healthDeduction: 10, severity: 3 };
  if (hr >= 120) return { level: 'critical', message: 'Severe Tachycardia Detected', recommendation: 'Seek immediate medical care', riskPoints: 35, healthDeduction: 25, severity: 5 };  // ✅ CHANGED > to >=
  if (hr > 100) return { level: 'warning', message: 'Tachycardia - Elevated Heart Rate', recommendation: 'Rest and monitor, reduce stress', riskPoints: 20, healthDeduction: 15, severity: 3 };
  return { level: 'normal', message: 'Heart Rate Normal', recommendation: 'Maintain healthy lifestyle', riskPoints: 0, healthDeduction: 0, severity: 0 };
};

 const analyzeSpO2 = (spo2) => {
  if (spo2 < 90) return { 
    level: 'critical', 
    message: 'Severe Hypoxemia - Critical Oxygen Level', 
    recommendation: 'Emergency medical attention needed', 
    riskPoints: 45, 
    healthDeduction: 35, 
    severity: 5 
  };
  if (spo2 <= 94) return { 
    level: 'warning', 
    message: 'Low Oxygen Saturation', 
    recommendation: 'Supplemental oxygen may be needed', 
    riskPoints: 25, 
    healthDeduction: 20, 
    severity: 4 
  };
  if (spo2 < 96) return { 
    level: 'caution', 
    message: 'Slightly Low SpO2', 
    recommendation: 'Monitor breathing, ensure ventilation', 
    riskPoints: 10, 
    healthDeduction: 8, 
    severity: 2 
  };
  return { 
    level: 'normal', 
    message: 'Oxygen Saturation Optimal', 
    recommendation: 'Breathing is healthy', 
    riskPoints: 0, 
    healthDeduction: 0, 
    severity: 0 
  };
};

 const analyzeTemperature = (temp) => {
  if (temp < 26) return { 
    level: 'critical', 
    message: 'Critical Low Temperature', 
    recommendation: 'Immediate attention required', 
    riskPoints: 40, 
    healthDeduction: 30, 
    severity: 5 
  };
  if (temp >= 26 && temp < 28) return { 
    level: 'warning', 
    message: 'Low Temperature Alert', 
    recommendation: 'Monitor closely, seek warmth', 
    riskPoints: 20, 
    healthDeduction: 15, 
    severity: 3 
  };
  if (temp >= 28 && temp <= 30) return { 
    level: 'normal', 
    message: 'Temperature Normal', 
    recommendation: 'Temperature is in safe range', 
    riskPoints: 0, 
    healthDeduction: 0, 
    severity: 0 
  };
  if (temp > 30 && temp <= 32) return { 
    level: 'warning', 
    message: 'High Temperature Alert', 
    recommendation: 'Monitor closely, increase hydration', 
    riskPoints: 20, 
    healthDeduction: 15, 
    severity: 3 
  };
  if (temp > 32) return { 
    level: 'critical', 
    message: 'Critical High Temperature', 
    recommendation: 'Immediate medical attention required', 
    riskPoints: 40, 
    healthDeduction: 30, 
    severity: 5 
  };
  return { 
    level: 'normal', 
    message: 'Temperature Normal', 
    recommendation: 'Body temperature is healthy', 
    riskPoints: 0, 
    healthDeduction: 0, 
    severity: 0 
  };
};

  const analyzeHRV = (history) => {
    const recent = history.slice(-20);
    const heartRates = recent.map(r => r.heartRate);
    const mean = heartRates.reduce((a, b) => a + b, 0) / heartRates.length;
    const variance = heartRates.reduce((sum, hr) => sum + Math.pow(hr - mean, 2), 0) / heartRates.length;
    
    if (variance < 10) return { level: 'warning', message: 'Low Heart Rate Variability', recommendation: 'May indicate stress or fatigue', riskPoints: 15, healthDeduction: 10, severity: 3, variance };
    if (variance > 400) return { level: 'warning', message: 'High Heart Rate Variability', recommendation: 'Irregular rhythm detected', riskPoints: 20, healthDeduction: 15, severity: 3, variance };
    return { level: 'normal', message: 'Heart Rate Variability Normal', recommendation: 'Good cardiac autonomic function', riskPoints: 0, healthDeduction: 0, severity: 0, variance };
  };

  const analyzeTrends = (history) => {
    const recent = history.slice(-30);
    const hrTrend = calculateTrend(recent.map(r => r.heartRate));
    const spo2Trend = calculateTrend(recent.map(r => r.spo2));
    const tempTrend = calculateTrend(recent.map(r => r.temperature));
    
    return { hrTrend, spo2Trend, tempTrend };
  };

  const calculateTrend = (values) => {
    if (values.length < 2) return 'stable';
    const first = values.slice(0, Math.floor(values.length / 3)).reduce((a, b) => a + b, 0) / Math.floor(values.length / 3);
    const last = values.slice(-Math.floor(values.length / 3)).reduce((a, b) => a + b, 0) / Math.floor(values.length / 3);
    const change = ((last - first) / first) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  };

  const analyzeStressLevel = (history) => {
    const recent = history.slice(-20);
    const avgHR = recent.reduce((sum, r) => sum + r.heartRate, 0) / recent.length;
    const hrvVariance = recent.map(r => r.heartRate).reduce((sum, hr, i, arr) => {
      if (i === 0) return 0;
      return sum + Math.abs(hr - arr[i-1]);
    }, 0) / recent.length;
    
    if (avgHR > 90 && hrvVariance < 5) return { level: 'high', message: 'High Stress Level Detected', recommendation: 'Practice relaxation techniques', severity: 3 };
    if (avgHR > 80 || hrvVariance < 8) return { level: 'moderate', message: 'Moderate Stress Indicators', recommendation: 'Consider stress management', severity: 2 };
    return { level: 'normal', message: 'Stress Level Normal', recommendation: 'Maintain current wellness', severity: 0 };
  };

  const calculateStats = () => {
    if (data.length === 0) return { avgHeartRate: 0, minHeartRate: 0, maxHeartRate: 0, avgSpO2: 0, avgTemp: 0, avgECG: 0, avgHumidity: 0 };
    
    const heartRates = data.map(d => d.heartRate);
    const spo2Values = data.map(d => d.spo2);
    const tempValues = data.map(d => d.temperature);
    const ecgValues = data.map(d => d.ecgVoltage);
    const humidityValues = data.map(d => d.humidity);
    
    return {
      avgHeartRate: (heartRates.reduce((a, b) => a + b, 0) / heartRates.length).toFixed(0),
      minHeartRate: Math.min(...heartRates).toFixed(0),
      maxHeartRate: Math.max(...heartRates).toFixed(0),
      avgSpO2: (spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length).toFixed(1),
      avgTemp: (tempValues.reduce((a, b) => a + b, 0) / tempValues.length).toFixed(1),
      avgECG: (ecgValues.reduce((a, b) => a + b, 0) / ecgValues.length).toFixed(2),
      avgHumidity: (humidityValues.reduce((a, b) => a + b, 0) / humidityValues.length).toFixed(1),
      sdHeartRate: calculateSD(heartRates).toFixed(1),
      sdSpO2: calculateSD(spo2Values).toFixed(1)
    };
  };

  const calculateSD = (values) => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  };

  const stats = calculateStats();

  const getHeartRateDistribution = () => {
    if (data.length === 0) return [];
    const ranges = [
      { range: '40-60', min: 40, max: 60, count: 0, color: '#8b5cf6' },
      { range: '60-80', min: 60, max: 80, count: 0, color: '#06b6d4' },
      { range: '80-100', min: 80, max: 100, count: 0, color: '#10b981' },
      { range: '100-120', min: 100, max: 120, count: 0, color: '#f59e0b' },
      { range: '120+', min: 120, max: 200, count: 0, color: '#ef4444' }
    ];
    
    data.forEach(d => {
      ranges.forEach(range => {
        if (d.heartRate >= range.min && d.heartRate < range.max) {
          range.count++;
        }
      });
    });
    
    return ranges;
  };

  const getVitalSignsRadarData = () => {
    if (!currentReading) return [];
    return [
      { metric: 'Heart Rate', value: (currentReading.heartRate / 120) * 100, fullMark: 100 },
      { metric: 'SpO2', value: currentReading.spo2, fullMark: 100 },
      { metric: 'Temperature', value: ((currentReading.temperature - 25) / 10) * 100, fullMark: 100 },
      { metric: 'Humidity', value: currentReading.humidity, fullMark: 100 },
      { metric: 'Health Score', value: healthScore, fullMark: 100 }
    ];
  };

  const getFilteredData = () => {
    const dataToFilter = chartDataRef.current.slice(-100);
    
    if (timeRange === 'all') return dataToFilter;
    
    const now = new Date();
    const cutoff = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    }[timeRange];
    
    return dataToFilter.filter(d => {
      const time = new Date(d.timestamp);
      return now - time < cutoff;
    });
  };

  const filteredData = getFilteredData();

  const exportToExcel = () => {
    if (data.length === 0) {
      alert('No data available to export');
      return;
    }

    const headers = ['Timestamp', 'Time', 'Heart Rate (bpm)', 'SpO2 (%)', 'Temperature (°C)', 'Humidity (%)', 'ECG Voltage (mV)'];
    
    const stats = calculateStats();
    const summarySection = [
      'SOLDIER HEALTH DETECTION - MEDICAL REPORT',
      `Generated: ${new Date().toLocaleString()}`,
      `Soldier ID: nithish900681`,
      '',
      'OVERALL STATISTICS',
      `Average Heart Rate,${stats.avgHeartRate} bpm`,
      `Heart Rate Range,${stats.minHeartRate} - ${stats.maxHeartRate} bpm`,
      `Average SpO2,${stats.avgSpO2}%`,
      `Average Temperature,${stats.avgTemp}°C`,
      `Average Humidity,${stats.avgHumidity}%`,
      `Heart Rate Variability,${stats.sdHeartRate} bpm`,
      `Total Readings,${data.length}`,
      `Health Score,${healthScore}/100`,
      `Risk Score,${riskScore}/100`,
      '',
      'CURRENT READINGS',
      currentReading ? `Heart Rate,${currentReading.heartRate.toFixed(0)} bpm` : '',
      currentReading ? `SpO2,${currentReading.spo2.toFixed(1)}%` : '',
      currentReading ? `Temperature,${currentReading.temperature.toFixed(1)}°C` : '',
      '',
      'ACTIVE ALERTS',
      ...alerts.map(alert => `${alert.metric},${alert.message},${alert.recommendation}`),
      '',
      'DETAILED READINGS',
      headers.join(',')
    ];

    const dataRows = data.map(row => [
      row.timestamp,
      row.time,
      row.heartRate.toFixed(1),
      row.spo2.toFixed(1),
      row.temperature.toFixed(1),
      row.humidity.toFixed(1),
      row.ecgVoltage.toFixed(2)
    ].join(','));

    const csvContent = [...summarySection, ...dataRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `soldier_health_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '', 'height=800,width=1200');
    const stats = calculateStats();
    
    printWindow.document.write('<html><head><title>Soldier Health Report</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { 
        font-family: 'Courier New', monospace; 
        padding: 40px; 
        color: #1a1a1a;
        background: white;
      }
      h1 { 
        color: #000; 
        border-bottom: 4px solid #2c3e50; 
        padding-bottom: 15px;
        font-size: 32px;
        text-align: center;
      }
      h2 { 
        color: #2c3e50; 
        margin-top: 30px;
        font-size: 24px;
        border-bottom: 2px solid #34495e;
        padding-bottom: 8px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      th {
        background: #34495e;
        color: white;
        padding: 12px;
        text-align: left;
        font-weight: 600;
      }
      td {
        border: 1px solid #bdc3c7;
        padding: 10px;
      }
      tr:nth-child(even) {
        background: #ecf0f1;
      }
      .header-box {
        border: 2px solid #2c3e50;
        padding: 20px;
        margin-bottom: 20px;
        background: #f8f9fa;
      }
      .footer {
        margin-top: 40px;
        text-align: center;
        color: #7f8c8d;
        font-size: 12px;
      }
    `);
    printWindow.document.write('</style></head><body>');
    
    printWindow.document.write('<div class="header-box">');
    printWindow.document.write('<h1>SOLDIER HEALTH DETECTION SYSTEM</h1>');
    printWindow.document.write('<h2 style="text-align: center; border: none; margin: 10px 0;">Tactical Health Assessment Report</h2>');
    printWindow.document.write('</div>');
    
    printWindow.document.write(`<p><strong>Soldier ID:</strong> nithish900681</p>`);
    printWindow.document.write(`<p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>`);
    printWindow.document.write(`<p><strong>Total Records:</strong> ${data.length}</p>`);
    
    printWindow.document.write('<h2>VITAL SIGNS SUMMARY</h2>');
    printWindow.document.write('<table>');
    printWindow.document.write('<tr><th>PARAMETER</th><th>VALUE</th><th>STATUS</th></tr>');
    printWindow.document.write(`<tr><td>Health Score</td><td>${healthScore}/100</td><td>${healthScore >= 80 ? 'OPTIMAL' : healthScore >= 60 ? 'ACCEPTABLE' : 'CRITICAL'}</td></tr>`);
    printWindow.document.write(`<tr><td>Risk Score</td><td>${riskScore}/100</td><td>${riskScore < 20 ? 'LOW' : riskScore < 50 ? 'MODERATE' : 'HIGH'}</td></tr>`);
    printWindow.document.write(`<tr><td>Avg Heart Rate</td><td>${stats.avgHeartRate} bpm</td><td>NORMAL</td></tr>`);
    printWindow.document.write(`<tr><td>Avg SpO2</td><td>${stats.avgSpO2}%</td><td>NORMAL</td></tr>`);
    printWindow.document.write(`<tr><td>Avg Temperature</td><td>${stats.avgTemp}°C</td><td>NORMAL</td></tr>`);
    printWindow.document.write('</table>');
    
    if (currentReading) {
      printWindow.document.write('<h2>CURRENT READINGS</h2>');
      printWindow.document.write('<table>');
      printWindow.document.write('<tr><th>VITAL SIGN</th><th>CURRENT VALUE</th></tr>');
      printWindow.document.write(`<tr><td>Heart Rate</td><td>${currentReading.heartRate.toFixed(0)} bpm</td></tr>`);
      printWindow.document.write(`<tr><td>SpO2</td><td>${currentReading.spo2.toFixed(1)}%</td></tr>`);
      printWindow.document.write(`<tr><td>Temperature</td><td>${currentReading.temperature.toFixed(1)}°C</td></tr>`);
      printWindow.document.write(`<tr><td>Humidity</td><td>${currentReading.humidity.toFixed(1)}%</td></tr>`);
      printWindow.document.write('</table>');
    }
    
    printWindow.document.write('<div class="footer">');
    printWindow.document.write('<p>SOLDIER HEALTH DETECTION SYSTEM - TACTICAL MEDICAL INTELLIGENCE</p>');
    printWindow.document.write('<p>FOR AUTHORIZED PERSONNEL ONLY</p>');
    printWindow.document.write(`<p>Report generated on ${new Date().toLocaleString()}</p>`);
    printWindow.document.write('</div>');
    
    printWindow.document.write('</body></html>');
    printWindow.document.close();
  };

  const shareWithDoctor = () => {
    if (data.length === 0) {
      alert('No data available to share');
      return;
    }

    const stats = calculateStats();
    const subject = encodeURIComponent('Soldier Health Report - nithish900681');
    const body = encodeURIComponent(`
SOLDIER HEALTH DETECTION SYSTEM - MEDICAL REPORT
================================================

Soldier ID: nithish900681
Generated: ${new Date().toLocaleString()}

HEALTH SUMMARY
Health Score: ${healthScore}/100
Risk Score: ${riskScore}/100

AVERAGE METRICS
Heart Rate: ${stats.avgHeartRate} bpm
SpO2: ${stats.avgSpO2}%
Temperature: ${stats.avgTemp}°C
Humidity: ${stats.avgHumidity}%

CURRENT READINGS
Heart Rate: ${currentReading?.heartRate.toFixed(0)} bpm
SpO2: ${currentReading?.spo2.toFixed(1)}%
Temperature: ${currentReading?.temperature.toFixed(1)}°C
Humidity: ${currentReading?.humidity.toFixed(1)}%

Total Readings: ${data.length}

Please review and advise accordingly.
    `);

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const theme = {
    primary: '#1a3a3a',      // Dark Military Green
    secondary: '#2c5f2d',    // Military Green
    accent: '#d4af37',       // Gold (Military Medal)
    success: '#228b22',      // Forest Green
    warning: '#ff8c00',      // Orange (Alert)
    danger: '#dc143c',       // Crimson
    dark: '#0a0e27',         // Deep Blue Black
    light: '#f5f5f5',
    metallic: '#c0c0c0'      // Silver
  };

  const menuItems = [
    { id: 'dashboard', label: 'Command Center', icon: Compass },
    { id: 'analytics', label: 'Intelligence', icon: Target },
    { id: 'vitals', label: 'Field Status', icon: Heart },
    { id: 'reports', label: 'Dispatches', icon: FileText },
    { id: 'settings', label: 'Ops Control', icon: Settings },
  ];

  const containerStyle = {
    display: 'flex',
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${theme.dark} 0%, #1a1a2e 50%, #0a0e27 100%)`,
    color: '#fff',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    overflow: 'hidden'
  };

  const sidebarStyle = {
    width: sidebarOpen ? '280px' : '80px',
    background: `linear-gradient(180deg, rgba(26, 58, 58, 0.95) 0%, rgba(44, 95, 45, 0.95) 100%)`,
    backdropFilter: 'blur(20px)',
    borderRight: `3px solid ${theme.accent}`,
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s ease',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
    position: 'relative'
  };

  const mainContentStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    position: 'relative'
  };

  const headerStyle = {
    padding: '20px 30px',
    background: `linear-gradient(90deg, rgba(26, 58, 58, 0.9) 0%, rgba(44, 95, 45, 0.9) 100%)`,
    borderBottom: `2px solid ${theme.accent}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
  };

  const contentStyle = {
    padding: '30px',
    flex: 1,
    overflow: 'auto',
    background: `radial-gradient(circle at 20% 50%, rgba(44, 95, 45, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(212, 175, 55, 0.05) 0%, transparent 50%)`
  };

  // Military-themed SVG Badge
  const MilitaryBadge = () => (
    <svg width="50" height="50" viewBox="0 0 50 50" style={{ filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.5))' }}>
      <defs>
        <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: theme.accent, stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#b8860b', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path d="M 25 5 L 35 10 L 35 25 Q 25 35 25 35 Q 15 25 15 25 L 15 10 Z" fill="url(#badgeGrad)" stroke="#fff" strokeWidth="0.5"/>
      <path d="M 25 18 Q 22 16 20 18 Q 18 20 20 22 Q 25 27 25 27 Q 30 22 32 20 Q 33 18 31 16 Q 28 15 25 18" fill="#fff" opacity="0.9"/>
      <circle cx="18" cy="12" r="1.5" fill="#ff6b6b" opacity="0.8"/>
      <circle cx="32" cy="12" r="1.5" fill="#ff6b6b" opacity="0.8"/>
    </svg>
  );

  // Circular Card Component
  const CircularCard = ({ value, label, icon: Icon, color, isLarge = false, status = '' }) => {
    const size = isLarge ? 200 : 140;
    const innerSize = isLarge ? 160 : 100;
    
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        perspective: '1000px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: 'scale(1)',
        ':hover': { transform: 'scale(1.1)' }
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.08) rotateY(5deg)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1) rotateY(0deg)';
      }}
      >
        <div style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}40 0%, ${color}20 100%)`,
          border: `3px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: `0 0 30px ${color}60, inset 0 0 30px ${color}20`,
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            width: innerSize,
            height: innerSize,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${color}30 0%, ${color}10 100%)`,
            border: `2px solid ${color}80`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            position: 'relative'
          }}>
            <Icon size={isLarge ? 48 : 32} color={color} strokeWidth={1.5} />
            
           <p style={{
  margin: 0,
  marginBottom: '15px',
  fontSize: isLarge ? '32px' : '24px',
  fontWeight: '900',
  color: color,
  textAlign: 'center',
  lineHeight: '1',
  textShadow: `0 0 10px ${color}80`
}}>
  {value}
</p>
            
            {status && (
              <div style={{
                fontSize: '10px',
                fontWeight: '700',
                color: '#fff',
                background: color,
                padding: '2px 8px',
                borderRadius: '10px',
                position: 'absolute',
                bottom: '8px',
                textTransform: 'uppercase'
              }}>
                {status}
              </div>
            )}
          </div>
          
          <div style={{
            position: 'absolute',
            width: size + 10,
            height: size + 10,
            borderRadius: '50%',
            border: `2px solid ${color}`,
            opacity: 0.3,
            animation: 'pulse-border 3s ease-in-out infinite'
          }}></div>
        </div>
        
        <p style={{
          margin: 0,
          fontSize: '13px',
          fontWeight: '600',
          color: color,
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          {label}
        </p>
      </div>
    );
  };

  // Dashboard View Component
  const DashboardView = () => (
    <div>
      {/* Military Header Banner */}
      <div style={{
        background: `linear-gradient(90deg, ${theme.primary} 0%, ${theme.secondary} 50%, ${theme.primary} 100%)`,
        borderLeft: `8px solid ${theme.accent}`,
        borderRight: `8px solid ${theme.accent}`,
        padding: '20px 30px',
        borderRadius: '8px',
        marginBottom: '30px',
        boxShadow: `0 10px 30px ${theme.accent}40, inset 0 1px 0 rgba(255,255,255,0.1)`,
        textAlign: 'center'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: '900',
          color: theme.accent,
          textShadow: `0 2px 4px rgba(0,0,0,0.5)`,
          letterSpacing: '2px',
          textTransform: 'uppercase'
        }}>
          ⚔️ SOLDIER TACTICAL HEALTH COMMAND CENTER ⚔️
        </h2>
        <p style={{
          margin: '8px 0 0 0',
          fontSize: '12px',
          color: '#cbd5e1',
          fontWeight: '600',
          letterSpacing: '1px'
        }}>
          REAL-TIME VITALS MONITORING • OPERATIONAL STATUS: {healthScore >= 80 ? 'COMBAT READY' : healthScore >= 60 ? 'OPERATIONAL' : 'MEDICAL ALERT'}
        </p>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '700',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: theme.danger,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            margin: 0
          }}>
            🚨 ACTIVE FIELD ALERTS
            <span style={{
              padding: '4px 12px',
              background: `${theme.danger}40`,
              color: theme.danger,
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '700'
            }}>
              {alerts.length}
            </span>
          </h3>
          <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
            {alerts.slice(0, 5).map((alert, index) => (
              <div key={index} style={{
                background: `linear-gradient(135deg, ${alert.type === 'danger' ? theme.danger : theme.warning}20 0%, ${alert.type === 'danger' ? theme.danger : theme.warning}05 100%)`,
                backdropFilter: 'blur(20px)',
                borderRadius: '12px',
                padding: '16px',
                border: `2px solid ${alert.type === 'danger' ? theme.danger : theme.warning}80`,
                boxShadow: `0 8px 32px ${alert.type === 'danger' ? theme.danger : theme.warning}30`,
                transition: 'all 0.3s ease',
                display: 'flex',
                gap: '12px'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = alert.type === 'danger' ? theme.danger : theme.warning}
              onMouseLeave={e => e.currentTarget.style.borderColor = `${alert.type === 'danger' ? theme.danger : theme.warning}80`}
              >
                <div style={{
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  {alert.type === 'danger' ? '⚠️' : '⚡'}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#fff',
                    marginBottom: '4px'
                  }}>
                    {alert.metric} — {alert.message}
                  </h4>
                  <p style={{
                    margin: '4px 0',
                    fontSize: '12px',
                    color: '#cbd5e1'
                  }}>
                    📊 Current: <span style={{ fontWeight: '700' }}>{alert.value}</span>
                  </p>
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '12px',
                    color: '#94a3b8'
                  }}>
                    ✓ Action: {alert.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Vital Circles */}
      {currentReading && (
        <div style={{
          marginBottom: '30px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '700',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: theme.accent,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            margin: 0
          }}>
            💪 VITAL SIGNS INDICATOR
          </h3>
          
          {/* Circular Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '30px',
            marginTop: '34px',
            justifyItems: 'center'
          }}>
            <CircularCard
              value={currentReading.heartRate.toFixed(0)}
              label="Heart Rate"
              icon={Heart}
              color={healthStatus.heartRate?.level === 'normal' ? theme.success : theme.danger}
              status={healthStatus.heartRate?.level === 'normal' ? '✓ OK' : '⚠ ALERT'}
            />
            
            <CircularCard
              value={currentReading.spo2.toFixed(1)}
              label="Oxygen Level"
              icon={Wind}
              color={healthStatus.spo2?.level === 'normal' ? theme.success : theme.danger}
              status={healthStatus.spo2?.level === 'normal' ? '✓ OK' : '⚠ LOW'}
            />
            
            <CircularCard
              value={currentReading.temperature.toFixed(1)}
              label="Body Temp"
              icon={Thermometer}
              color={healthStatus.temperature?.level === 'normal' ? theme.success : theme.warning}
              status={healthStatus.temperature?.level === 'normal' ? '✓ OK' : '⚠ CHECK'}
            />
            
            <CircularCard
              value={currentReading.humidity.toFixed(1)}
              label="Humidity"
              icon={Droplets}
              color={currentReading.humidity >= 30 && currentReading.humidity <= 60 ? theme.secondary : theme.warning}
              status={currentReading.humidity >= 30 && currentReading.humidity <= 60 ? '✓ OK' : 'MONITOR'}
            />
            
            <CircularCard
              value={healthScore.toFixed(0)}
              label="Health Score"
              icon={Shield}
              color={healthScore >= 80 ? theme.success : healthScore >= 60 ? theme.warning : theme.danger}
              status={healthScore >= 80 ? 'STRONG' : healthScore >= 60 ? 'FAIR' : 'WEAK'}
            />
            
            <CircularCard
              value={riskScore.toFixed(0)}
              label="Risk Level"
              icon={AlertTriangle}
              color={riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger}
              status={riskScore < 20 ? 'LOW' : riskScore < 50 ? 'MED' : 'HIGH'}
            />
          </div>
        </div>
      )}

      {/* Large Info Circles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '40px',
        marginTop: '40px',
        marginBottom: '30px',
        justifyItems: 'center'
      }}>
        {/* Large Health Circle */}
        <CircularCard
          value={`${healthScore.toFixed(0)}`}
          label="OPERATIONAL STATUS"
          icon={MedalIcon}
          color={theme.accent}
          isLarge={true}
          status={healthScore >= 80 ? 'COMBAT READY' : 'MONITOR'}
        />
        
        {/* Large Risk Circle */}
        <CircularCard
          value={`${riskScore.toFixed(0)}`}
          label="THREAT LEVEL"
          icon={Crosshair}
          color={riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger}
          isLarge={true}
          status={riskScore < 20 ? 'SAFE' : riskScore < 50 ? 'CAUTION' : 'CRITICAL'}
        />
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '30px' }}>
        {/* Heart Rate Chart */}
        <div style={{
          background: `linear-gradient(135deg, rgba(34, 139, 34, 0.1) 0%, rgba(34, 139, 34, 0.05) 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.success}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: theme.success, textTransform: 'uppercase', margin: 0 }}>
            ❤️ HEART RATE TELEMETRY
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="colorHR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.success} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={theme.success} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" domain={[40, 140]} />
              <Tooltip contentStyle={{ background: 'rgba(26, 58, 58, 0.95)', border: `1px solid ${theme.success}`, borderRadius: '12px', color: 'white' }} />
              <Area type="monotone" dataKey="heartRate" stroke={theme.success} strokeWidth={3} fillOpacity={1} fill="url(#colorHR)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* SpO2 Chart */}
        <div style={{
          background: `linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.accent}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: theme.accent, textTransform: 'uppercase', margin: 0 }}>
            🫁 OXYGEN SATURATION
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="colorSpO2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.accent} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={theme.accent} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" domain={[85, 100]} />
              <Tooltip contentStyle={{ background: 'rgba(26, 58, 58, 0.95)', border: `1px solid ${theme.accent}`, borderRadius: '12px', color: 'white' }} />
              <Area type="monotone" dataKey="spo2" stroke={theme.accent} strokeWidth={3} fillOpacity={1} fill="url(#colorSpO2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Temperature Chart */}
        <div style={{
          background: `linear-gradient(135deg, rgba(255, 140, 0, 0.1) 0%, rgba(255, 140, 0, 0.05) 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.warning}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: theme.warning, textTransform: 'uppercase', margin: 0 }}>
            🌡️ TEMPERATURE TRACKING
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" domain={[25, 35]} />
              <Tooltip contentStyle={{ background: 'rgba(26, 58, 58, 0.95)', border: `1px solid ${theme.warning}`, borderRadius: '12px', color: 'white' }} />
              <Line type="monotone" dataKey="temperature" stroke={theme.warning} strokeWidth={3} dot={{ r: 4, fill: theme.warning }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Humidity Chart */}
        <div style={{
          background: `linear-gradient(135deg, rgba(44, 95, 45, 0.1) 0%, rgba(44, 95, 45, 0.05) 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.secondary}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: theme.secondary, textTransform: 'uppercase', margin: 0 }}>
            💧 HUMIDITY LEVELS
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="colorHumidity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.secondary} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={theme.secondary} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip contentStyle={{ background: 'rgba(26, 58, 58, 0.95)', border: `1px solid ${theme.secondary}`, borderRadius: '12px', color: 'white' }} />
              <Area type="monotone" dataKey="humidity" stroke={theme.secondary} strokeWidth={3} fillOpacity={1} fill="url(#colorHumidity)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution Chart */}
        <div style={{
          background: `linear-gradient(135deg, rgba(220, 20, 60, 0.1) 0%, rgba(220, 20, 60, 0.05) 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.danger}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: theme.danger, textTransform: 'uppercase', margin: 0 }}>
            📊 HEART RATE DISTRIBUTION
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={getHeartRateDistribution()}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="range" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: 'rgba(26, 58, 58, 0.95)', border: `1px solid ${theme.danger}`, borderRadius: '12px', color: 'white' }} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {getHeartRateDistribution().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div style={{
          background: `linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(44, 95, 45, 0.1) 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.metallic}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: theme.metallic, textTransform: 'uppercase', margin: 0 }}>
            🎯 TACTICAL OVERVIEW
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={getVitalSignsRadarData()}>
              <PolarGrid stroke="rgba(255,255:255,255,0.2)" />
              <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={11} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#94a3b8" />
              <Radar name="Current Status" dataKey="value" stroke={theme.accent} fill={theme.accent} fillOpacity={0.5} strokeWidth={2} />
              <Tooltip contentStyle={{ background: 'rgba(26, 58, 58, 0.95)', border: `1px solid ${theme.accent}`, borderRadius: '12px', color: 'white' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Statistics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '16px',
        marginTop: '30px'
      }}>
        {[
          { label: 'Avg HR', value: `${stats.avgHeartRate}`, unit: 'bpm', icon: '❤️' },
          { label: 'HR Range', value: `${stats.minHeartRate}-${stats.maxHeartRate}`, unit: 'bpm', icon: '📈' },
          { label: 'Avg SpO2', value: `${stats.avgSpO2}`, unit: '%', icon: '🫁' },
          { label: 'Avg Temp', value: `${stats.avgTemp}`, unit: '°C', icon: '🌡️' },
          { label: 'Avg Humidity', value: `${stats.avgHumidity}`, unit: '%', icon: '💧' },
          { label: 'HR Variability', value: `${stats.sdHeartRate}`, unit: 'SD', icon: '📊' },
          { label: 'Total Records', value: data.length, unit: 'readings', icon: '📋' },
          { label: 'Monitoring', value: Math.floor(data.length / 12), unit: 'min', icon: '⏱️' }
        ].map((stat, idx) => (
          <div
            key={idx}
            style={{
              background: `linear-gradient(135deg, ${theme.secondary}20 0%, ${theme.secondary}05 100%)`,
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${theme.secondary}40`,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              cursor: 'pointer'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 12px 48px ${theme.secondary}40`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
            }}
          >
            <p style={{ margin: '0 0 8px 0', fontSize: '20px' }}>{stat.icon}</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {stat.label}
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '20px', fontWeight: '800', color: theme.accent }}>
              {stat.value}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
              {stat.unit}
            </p>
          </div>
        ))}
      </div>

      {/* Last Update */}
      {lastUpdate && (
        <div style={{
          marginTop: '30px',
          padding: '16px 20px',
          background: `linear-gradient(135deg, ${theme.primary}40 0%, ${theme.secondary}40 100%)`,
          borderRadius: '12px',
          backdropFilter: 'blur(10px)',
          border: `2px dashed ${theme.accent}80`,
          textAlign: 'center',
          color: theme.metallic,
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          <Clock size={16} />
          LAST SYNC: {lastUpdate.toLocaleTimeString()} | AUTO-REFRESH: 5s | SOLDIER ID: nithish900681
        </div>
      )}
    </div>
  );

  const AnalyticsView = () => (
    <div>
      <div style={{
        background: `linear-gradient(90deg, ${theme.primary} 0%, ${theme.secondary} 50%, ${theme.primary} 100%)`,
        borderLeft: `8px solid ${theme.accent}`,
        borderRight: `8px solid ${theme.accent}`,
        padding: '20px 30px',
        borderRadius: '8px',
        marginBottom: '30px',
        boxShadow: `0 10px 30px ${theme.accent}40`,
        textAlign: 'center'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: '900',
          color: theme.accent,
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          📡 TACTICAL INTELLIGENCE & ANALYSIS 📡
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
        {/* Hourly Trends */}
        <div style={{
          background: `linear-gradient(135deg, rgba(34, 139, 34, 0.1) 0%, rgba(34, 139, 34, 0.05) 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.success}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: theme.success, textTransform: 'uppercase', margin: 0 }}>
            📈 HOURLY TRENDS
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={historicalData.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: 'rgba(26, 58, 58, 0.95)', border: `1px solid ${theme.success}`, borderRadius: '12px', color: 'white' }} />
              <Legend />
              <Area type="monotone" dataKey="avgHeartRate" fill={`${theme.success}20`} stroke={theme.success} name="Avg HR" />
              <Line type="monotone" dataKey="maxHeartRate" stroke="#dc2626" strokeWidth={2} name="Max HR" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="minHeartRate" stroke="#fca5a5" strokeWidth={2} name="Min HR" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Multi-Metric */}
        <div style={{
          background: `linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.accent}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: theme.accent, textTransform: 'uppercase', margin: 0 }}>
            🎯 MULTI-METRIC COMPARISON
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={historicalData.daily.slice(-12)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: 'rgba(26, 58, 58, 0.95)', border: `1px solid ${theme.accent}`, borderRadius: '12px', color: 'white' }} />
              <Legend />
              <Bar dataKey="avgHeartRate" fill={theme.success} radius={[8, 8, 0, 0]} name="Heart Rate" />
              <Bar dataKey="avgSpO2" fill={theme.accent} radius={[8, 8, 0, 0]} name="SpO2" />
              <Bar dataKey="avgTemp" fill={theme.warning} radius={[8, 8, 0, 0]} name="Temperature" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SpO2 vs HR */}
        <div style={{
          background: `linear-gradient(135deg, rgba(220, 20, 60, 0.1) 0%, rgba(220, 20, 60, 0.05) 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.danger}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: theme.danger, textTransform: 'uppercase', margin: 0 }}>
            🔗 CORRELATION ANALYSIS
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" dataKey="heartRate" name="Heart Rate" stroke="#94a3b8" domain={[50, 120]} />
              <YAxis type="number" dataKey="spo2" name="SpO2" stroke="#94a3b8" domain={[90, 100]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'rgba(26, 58, 58, 0.95)', border: `1px solid ${theme.danger}`, borderRadius: '12px', color: 'white' }} />
              <Scatter name="Readings" data={data.slice(-50)} fill={theme.danger} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Temperature Stability */}
        <div style={{
          background: `linear-gradient(135deg, rgba(255, 140, 0, 0.1) 0%, rgba(255, 140, 0, 0.05) 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.warning}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: theme.warning, textTransform: 'uppercase', margin: 0 }}>
            🌡️ TEMPERATURE STABILITY
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={historicalData.daily}>
              <defs>
                <linearGradient id="colorTempAnalytics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.warning} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={theme.warning} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" domain={[25, 35]} />
              <Tooltip contentStyle={{ background: 'rgba(26, 58, 58, 0.95)', border: `1px solid ${theme.warning}`, borderRadius: '12px', color: 'white' }} />
              <Area type="monotone" dataKey="avgTemp" stroke={theme.warning} strokeWidth={3} fillOpacity={1} fill="url(#colorTempAnalytics)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Data Quality */}
        <div style={{
          background: `linear-gradient(135deg, rgba(44, 95, 45, 0.1) 0%, rgba(44, 95, 45, 0.05) 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.secondary}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: theme.secondary, textTransform: 'uppercase', margin: 0 }}>
            ✅ DATA INTEGRITY
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={historicalData.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: 'rgba(26, 58, 58, 0.95)', border: `1px solid ${theme.secondary}`, borderRadius: '12px', color: 'white' }} />
              <Line type="monotone" dataKey="count" stroke={theme.secondary} strokeWidth={3} dot={{ r: 4, fill: theme.secondary }} name="Readings/Hour" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Humidity Analysis */}
        <div style={{
          background: `linear-gradient(135deg, rgba(200, 200, 200, 0.1) 0%, rgba(200, 200, 200, 0.05) 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.metallic}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: theme.metallic, textTransform: 'uppercase', margin: 0 }}>
            💧 ENVIRONMENTAL MONITORING
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={historicalData.daily}>
              <defs>
                <linearGradient id="colorHumidityAnalytics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.metallic} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={theme.metallic} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip contentStyle={{ background: 'rgba(26, 58, 58, 0.95)', border: `1px solid ${theme.metallic}`, borderRadius: '12px', color: 'white' }} />
              <Area type="monotone" dataKey="avgHumidity" stroke={theme.metallic} strokeWidth={3} fillOpacity={1} fill="url(#colorHumidityAnalytics)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Analytics Stats */}
      <div style={{
        background: `linear-gradient(135deg, ${theme.primary}40 0%, ${theme.secondary}40 100%)`,
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        padding: '24px',
        border: `2px solid ${theme.accent}40`,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        marginTop: '24px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: theme.accent, textTransform: 'uppercase', margin: 0 }}>
          📊 STATISTICAL INTELLIGENCE
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '16px' }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            padding: '16px',
            border: `1px solid ${theme.success}40`,
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>HR Variability</p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: theme.success }}>{stats.sdHeartRate}</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#64748b' }}>Standard Deviation</p>
          </div>
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            padding: '16px',
            border: `1px solid ${theme.accent}40`,
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>SpO2 Variability</p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: theme.accent }}>{stats.sdSpO2}</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#64748b' }}>Standard Deviation</p>
          </div>
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            padding: '16px',
            border: `1px solid ${theme.warning}40`,
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Peak HR</p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: theme.warning }}>{stats.maxHeartRate}</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#64748b' }}>Maximum Recorded</p>
          </div>
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            padding: '16px',
            border: `1px solid ${theme.secondary}40`,
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Minimum HR</p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: theme.secondary }}>{stats.minHeartRate}</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#64748b' }}>Minimum Recorded</p>
          </div>
        </div>
      </div>
    </div>
  );

  const VitalsView = () => (
    <div>
      <div style={{
        background: `linear-gradient(90deg, ${theme.primary} 0%, ${theme.secondary} 50%, ${theme.primary} 100%)`,
        borderLeft: `8px solid ${theme.accent}`,
        borderRight: `8px solid ${theme.accent}`,
        padding: '20px 30px',
        borderRadius: '8px',
        marginBottom: '30px',
        boxShadow: `0 10px 30px ${theme.accent}40`,
        textAlign: 'center'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: '900',
          color: theme.accent,
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          🎖️ FIELD VITALS RECONNAISSANCE 🎖️
        </h2>
      </div>

      {currentReading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
          {/* Heart Rate Detailed */}
          <div style={{
            background: `linear-gradient(135deg, ${theme.success}20 0%, ${theme.success}05 100%)`,
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '28px',
            border: `2px solid ${theme.success}40`,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: '700'
              }}>
                ❤️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>HEART RATE</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Beats Per Minute</p>
              </div>
            </div>
            
            <div style={{
              background: `${theme.success}20`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Current Reading</p>
              <p style={{ margin: 0, fontSize: '48px', fontWeight: '900', color: theme.success, lineHeight: '1' }}>
                {currentReading.heartRate.toFixed(0)}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>bpm</p>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              borderLeft: `4px solid ${theme.success}`
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Safe Combat Range</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: theme.success }}>60 - 100 BPM</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>Resting state acceptable</p>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              background: currentReading.heartRate >= 60 && currentReading.heartRate <= 100 ? `${theme.success}40` : `${theme.danger}40`,
              color: currentReading.heartRate >= 60 && currentReading.heartRate <= 100 ? theme.success : theme.danger,
              border: `1px solid ${currentReading.heartRate >= 60 && currentReading.heartRate <= 100 ? theme.success : theme.danger}80`
            }}>
              {currentReading.heartRate >= 60 && currentReading.heartRate <= 100 ? '✓ COMBAT READY' : '⚠ MEDICAL REVIEW'}
            </div>
          </div>

          {/* SpO2 Detailed */}
          <div style={{
            background: `linear-gradient(135deg, ${theme.accent}20 0%, ${theme.accent}05 100%)`,
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '28px',
            border: `2px solid ${theme.accent}40`,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: '700'
              }}>
                🫁
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>OXYGEN SATURATION</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Blood O2 Level</p>
              </div>
            </div>
            
            <div style={{
              background: `${theme.accent}20`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Current Reading</p>
              <p style={{ margin: 0, fontSize: '48px', fontWeight: '900', color: theme.accent, lineHeight: '1' }}>
                {currentReading.spo2.toFixed(1)}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>%</p>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              borderLeft: `4px solid ${theme.accent}`
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Optimal Operational Range</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: theme.accent }}>95 - 100 %</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>Full respiratory capacity</p>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              background: currentReading.spo2 >= 95 && currentReading.spo2 <= 100 ? `${theme.success}40` : `${theme.danger}40`,
              color: currentReading.spo2 >= 95 && currentReading.spo2 <= 100 ? theme.success : theme.danger,
              border: `1px solid ${currentReading.spo2 >= 95 && currentReading.spo2 <= 100 ? theme.success : theme.danger}80`
            }}>
              {currentReading.spo2 >= 95 && currentReading.spo2 <= 100 ? '✓ OPTIMAL' : '⚠ LOW OXYGEN'}
            </div>
          </div>

          {/* Temperature Detailed */}
          <div style={{
            background: `linear-gradient(135deg, ${theme.warning}20 0%, ${theme.warning}05 100%)`,
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '28px',
            border: `2px solid ${theme.warning}40`,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: '700'
              }}>
                🌡️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>BODY TEMPERATURE</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Core Temperature</p>
              </div>
            </div>
            
            <div style={{
              background: `${theme.warning}20`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Current Reading</p>
              <p style={{ margin: 0, fontSize: '48px', fontWeight: '900', color: theme.warning, lineHeight: '1' }}>
                {currentReading.temperature.toFixed(1)}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>°Celsius</p>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              borderLeft: `4px solid ${theme.warning}`
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Safe Operational Range</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: theme.warning }}>28 - 30 °C</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>Acceptable combat zone</p>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              background: currentReading.temperature >= 28 && currentReading.temperature <= 30 ? `${theme.success}40` : `${theme.warning}40`,
              color: currentReading.temperature >= 28 && currentReading.temperature <= 30 ? theme.success : theme.warning,
              border: `1px solid ${currentReading.temperature >= 28 && currentReading.temperature <= 30 ? theme.success : theme.warning}80`
            }}>
              {currentReading.temperature >= 28 && currentReading.temperature <= 30 ? '✓ THERMAL STABLE' : '⚠ THERMAL ALERT'}
            </div>
          </div>

          {/* Humidity Detailed */}
          <div style={{
            background: `linear-gradient(135deg, ${theme.secondary}20 0%, ${theme.secondary}05 100%)`,
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '28px',
            border: `2px solid ${theme.secondary}40`,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: '700'
              }}>
                💧
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>HUMIDITY LEVEL</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Environmental Moisture</p>
              </div>
            </div>
            
            <div style={{
              background: `${theme.secondary}20`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Current Reading</p>
              <p style={{ margin: 0, fontSize: '48px', fontWeight: '900', color: theme.secondary, lineHeight: '1' }}>
                {currentReading.humidity.toFixed(1)}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>%</p>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              borderLeft: `4px solid ${theme.secondary}`
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Comfort Zone</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: theme.secondary }}>30 - 60 %</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>Optimal environment</p>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              background: currentReading.humidity >= 30 && currentReading.humidity <= 60 ? `${theme.success}40` : `${theme.secondary}40`,
              color: currentReading.humidity >= 30 && currentReading.humidity <= 60 ? theme.success : theme.secondary,
              border: `1px solid ${currentReading.humidity >= 30 && currentReading.humidity <= 60 ? theme.success : theme.secondary}80`
            }}>
              {currentReading.humidity >= 30 && currentReading.humidity <= 60 ? '✓ OPTIMAL' : 'ℹ MONITOR'}
            </div>
          </div>

          {/* Health Score Detailed */}
          <div style={{
            background: `linear-gradient(135deg, ${healthScore >= 80 ? theme.success : theme.warning}20 0%, ${healthScore >= 80 ? theme.success : theme.warning}05 100%)`,
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '28px',
            border: `2px solid ${healthScore >= 80 ? theme.success : theme.warning}40`,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: '700'
              }}>
                🎖️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>HEALTH SCORE</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Overall Wellness</p>
              </div>
            </div>
            
            <div style={{
              background: `${healthScore >= 80 ? theme.success : theme.warning}20`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Score</p>
              <p style={{ margin: 0, fontSize: '48px', fontWeight: '900', color: healthScore >= 80 ? theme.success : theme.warning, lineHeight: '1' }}>
                {healthScore.toFixed(0)}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>/100</p>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '100%',
                height: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: `${healthScore}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${healthScore >= 80 ? theme.success : theme.warning} 0%, ${healthScore >= 80 ? '#059669' : '#d97706'} 100%)`,
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                {healthScore >= 80 ? '✓ Excellent operational condition' : healthScore >= 60 ? 'Good condition' : 'Requires medical attention'}
              </p>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              background: healthScore >= 80 ? `${theme.success}40` : `${theme.warning}40`,
              color: healthScore >= 80 ? theme.success : theme.warning,
              border: `1px solid ${healthScore >= 80 ? theme.success : theme.warning}80`
            }}>
              {healthScore >= 80 ? '✓ COMBAT READY' : healthScore >= 60 ? '⚠ OPERATIONAL' : '⚠ MEDICAL ALERT'}
            </div>
          </div>

          {/* Risk Score Detailed */}
          <div style={{
            background: `linear-gradient(135deg, ${riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger}20 0%, ${riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger}05 100%)`,
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '28px',
            border: `2px solid ${riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger}40`,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: '700'
              }}>
                ⚔️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>THREAT LEVEL</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Risk Assessment</p>
              </div>
            </div>
            
            <div style={{
              background: `${riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger}20`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Risk Score</p>
              <p style={{ margin: 0, fontSize: '48px', fontWeight: '900', color: riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger, lineHeight: '1' }}>
                {riskScore.toFixed(0)}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>/100</p>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '100%',
                height: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: `${riskScore}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger} 0%, ${riskScore < 20 ? '#059669' : riskScore < 50 ? '#d97706' : '#991b1b'} 100%)`,
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                {riskScore < 20 ? '✓ Low risk - Healthy status' : riskScore < 50 ? 'Moderate risk - Monitor closely' : 'High risk - Immediate attention'}
              </p>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              background: riskScore < 20 ? `${theme.success}40` : riskScore < 50 ? `${theme.warning}40` : `${theme.danger}40`,
              color: riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger,
              border: `1px solid ${riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger}80`
            }}>
              {riskScore < 20 ? '✓ SAFE' : riskScore < 50 ? '⚠ CAUTION' : '🚨 CRITICAL'}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const ReportsView = () => (
    <div>
      <div style={{
        background: `linear-gradient(90deg, ${theme.primary} 0%, ${theme.secondary} 50%, ${theme.primary} 100%)`,
        borderLeft: `8px solid ${theme.accent}`,
        borderRight: `8px solid ${theme.accent}`,
        padding: '20px 30px',
        borderRadius: '8px',
        marginBottom: '30px',
        boxShadow: `0 10px 30px ${theme.accent}40`,
        textAlign: 'center'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: '900',
          color: theme.accent,
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          📜 OFFICIAL DISPATCHES & DOCUMENTS 📜
        </h2>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Overall Assessment */}
          <div style={{
            background: `linear-gradient(135deg, ${healthScore >= 80 ? theme.success : theme.warning}20 0%, ${healthScore >= 80 ? theme.success : theme.warning}05 100%)`,
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '24px',
            border: `2px solid ${healthScore >= 80 ? theme.success : theme.warning}40`,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', margin: 0, color: '#fff' }}>
              🎖️ HEALTH ASSESSMENT
            </h3>
            <div style={{
              background: `${healthScore >= 80 ? theme.success : theme.warning}20`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Overall Score</p>
              <p style={{ margin: 0, fontSize: '40px', fontWeight: '900', color: healthScore >= 80 ? theme.success : theme.warning }}>
                {healthScore.toFixed(0)}/100
              </p>
            </div>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: '#cbd5e1',
              lineHeight: '1.6',
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              borderLeft: `4px solid ${healthScore >= 80 ? theme.success : theme.warning}`
            }}>
              {healthScore >= 80 ? '✓ Soldier is in optimal combat-ready condition with excellent vital signs.' :
               healthScore >= 60 ? '⚠ Soldier is in acceptable operational condition. Monitor vital signs closely.' :
               '⚠ Soldier requires immediate medical evaluation and restricted duty assignment.'}
            </p>
          </div>

          {/* Risk Assessment */}
          <div style={{
            background: `linear-gradient(135deg, ${riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger}20 0%, ${riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger}05 100%)`,
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '24px',
            border: `2px solid ${riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger}40`,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', margin: 0, color: '#fff' }}>
              ⚔️ THREAT ASSESSMENT
            </h3>
            <div style={{
              background: `${riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger}20`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Risk Level</p>
              <p style={{ margin: 0, fontSize: '40px', fontWeight: '900', color: riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger }}>
                {riskScore.toFixed(0)}/100
              </p>
            </div>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: '#cbd5e1',
              lineHeight: '1.6',
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              borderLeft: `4px solid ${riskScore < 20 ? theme.success : riskScore < 50 ? theme.warning : theme.danger}`
            }}>
              {riskScore < 20 ? '✓ SAFE - Continue normal operations. Regular monitoring recommended.' :
               riskScore < 50 ? '⚠ MODERATE - Increase health monitoring frequency. Advise soldier to report any concerns.' :
               '🚨 HIGH - Immediate medical consultation required. Restrict strenuous activities.'}
            </p>
          </div>

          {/* Data Summary */}
          <div style={{
            background: `linear-gradient(135deg, ${theme.secondary}20 0%, ${theme.secondary}05 100%)`,
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '24px',
            border: `2px solid ${theme.secondary}40`,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', margin: 0, color: '#fff' }}>
              📊 MISSION DETAILS
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                background: `${theme.secondary}20`,
                borderRadius: '10px',
                padding: '12px'
              }}>
                <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase' }}>Soldier ID</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff' }}>nithish900681</p>
              </div>
              <div style={{
                background: `${theme.secondary}20`,
                borderRadius: '10px',
                padding: '12px'
              }}>
                <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase' }}>Total Records</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff' }}>{data.length}</p>
              </div>
              <div style={{
                background: `${theme.secondary}20`,
                borderRadius: '10px',
                padding: '12px'
              }}>
                <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase' }}>Duration</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff' }}>{Math.floor(data.length / 12)} min</p>
              </div>
              <div style={{
                background: `${theme.secondary}20`,
                borderRadius: '10px',
                padding: '12px'
              }}>
                <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase' }}>Report Date</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#fff' }}>2025-11-21</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vital Signs Table */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.accent}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          overflowX: 'auto'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: theme.accent, textTransform: 'uppercase', margin: 0 }}>
            📋 VITAL SIGNS STATUS REPORT
          </h3>
          {currentReading && (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '400px',
              marginTop: '16px'
            }}>
              <thead>
                <tr style={{ background: `${theme.accent}20`, borderBottom: `2px solid ${theme.accent}40` }}>
                  <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#fff', textTransform: 'uppercase' }}>VITAL SIGN</th>
                  <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#fff', textTransform: 'uppercase' }}>CURRENT</th>
                  <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#fff', textTransform: 'uppercase' }}>NORMAL RANGE</th>
                  <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#fff', textTransform: 'uppercase' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    metric: '❤️ Heart Rate',
                    current: `${currentReading.heartRate.toFixed(0)} bpm`,
                    range: '60-100 bpm',
                    isNormal: currentReading.heartRate >= 60 && currentReading.heartRate <= 100
                  },
                  {
                    metric: '🫁 Blood Oxygen',
                    current: `${currentReading.spo2.toFixed(1)}%`,
                    range: '95-100%',
                    isNormal: currentReading.spo2 >= 95 && currentReading.spo2 <= 100
                  },
                  {
                    metric: '🌡️ Temperature',
                    current: `${currentReading.temperature.toFixed(1)}°C`,
                    range: '28-30°C',
                    isNormal: currentReading.temperature >= 28 && currentReading.temperature <= 30
                  },
                  {
                    metric: '💧 Humidity',
                    current: `${currentReading.humidity.toFixed(1)}%`,
                    range: '30-60%',
                    isNormal: currentReading.humidity >= 30 && currentReading.humidity <= 60
                  }
                ].map((item, index) => (
                  <tr key={index} style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    background: index % 2 === 0 ? 'rgba(44, 95, 45, 0.1)' : 'transparent'
                  }}>
                    <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600', color: '#fff' }}>
                      {item.metric}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: theme.accent, fontWeight: '700' }}>
                      {item.current}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#94a3b8' }}>
                      {item.range}
                    </td>
                    <td style={{ padding: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: item.isNormal ? `${theme.success}40` : `${theme.danger}40`,
                        color: item.isNormal ? theme.success : theme.danger,
                        border: `1px solid ${item.isNormal ? theme.success : theme.danger}80`,
                        display: 'inline-block'
                      }}>
                        {item.isNormal ? '✓ NORMAL' : '⚠ ALERT'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Statistics Report */}
        <div style={{
                   background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.metallic}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: theme.metallic, textTransform: 'uppercase', margin: 0 }}>
            📊 STATISTICAL INTELLIGENCE REPORT
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '10px',
              padding: '16px',
              border: `1px solid ${theme.success}40`,
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Avg Heart Rate</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: theme.success }}>{stats.avgHeartRate}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#64748b' }}>bpm</p>
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '10px',
              padding: '16px',
              border: `1px solid ${theme.accent}40`,
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>HR Range</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: theme.accent }}>{stats.minHeartRate}-{stats.maxHeartRate}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#64748b' }}>bpm</p>
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '10px',
              padding: '16px',
              border: `1px solid ${theme.warning}40`,
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Avg SpO2</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: theme.warning }}>{stats.avgSpO2}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#64748b' }}>%</p>
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '10px',
              padding: '16px',
              border: `1px solid ${theme.secondary}40`,
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Avg Temp</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: theme.secondary }}>{stats.avgTemp}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#64748b' }}>°C</p>
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '10px',
              padding: '16px',
              border: `1px solid ${theme.success}40`,
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>HR Variability</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: theme.success }}>{stats.sdHeartRate}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#64748b' }}>SD</p>
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '10px',
              padding: '16px',
              border: `1px solid ${theme.accent}40`,
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>Avg Humidity</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: theme.accent }}>{stats.avgHumidity}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#64748b' }}>%</p>
            </div>
          </div>
        </div>

        {/* Active Alerts Report */}
        {alerts.length > 0 && (
          <div style={{
            background: `linear-gradient(135deg, ${theme.danger}20 0%, ${theme.danger}05 100%)`,
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '24px',
            border: `2px solid ${theme.danger}40`,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', margin: 0, color: theme.danger, textTransform: 'uppercase' }}>
              🚨 ACTIVE FIELD ALERTS
              <span style={{
                padding: '4px 10px',
                background: `${theme.danger}40`,
                color: theme.danger,
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700'
              }}>
                {alerts.length} ACTIVE
              </span>
            </h3>
            <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
              {alerts.map((alert, index) => (
                <div key={index} style={{
                  background: `${alert.type === 'danger' ? theme.danger : theme.warning}15`,
                  borderRadius: '10px',
                  padding: '14px',
                  border: `2px solid ${alert.type === 'danger' ? theme.danger : theme.warning}60`,
                  display: 'flex',
                  gap: '12px'
                }}>
                  <div style={{
                    fontSize: '20px',
                    flexShrink: 0
                  }}>
                    {alert.type === 'danger' ? '🚨' : '⚠️'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#fff',
                      marginBottom: '4px'
                    }}>
                      {alert.metric} — {alert.message}
                    </h4>
                    <p style={{
                      margin: '4px 0',
                      fontSize: '12px',
                      color: '#cbd5e1'
                    }}>
                      📊 Value: <span style={{ fontWeight: '700' }}>{alert.value}</span>
                    </p>
                    <p style={{
                      margin: '4px 0 0 0',
                      fontSize: '11px',
                      color: '#94a3b8'
                    }}>
                      ✓ Action Required: {alert.recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export Buttons */}
        <div style={{
          background: `linear-gradient(135deg, ${theme.primary}40 0%, ${theme.secondary}40 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.accent}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', margin: 0, color: theme.accent, textTransform: 'uppercase' }}>
            📥 EXPORT & SHARE OPERATIONS
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '16px' }}>
            <button
              onClick={exportToPDF}
              style={{
                padding: '14px 20px',
                background: `linear-gradient(135deg, ${theme.secondary} 0%, #1a5c2a 100%)`,
                border: `2px solid ${theme.secondary}80`,
                borderRadius: '10px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: `0 4px 15px ${theme.secondary}40`
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 25px ${theme.secondary}60`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 15px ${theme.secondary}40`;
              }}
            >
              📄 PDF REPORT
            </button>
            <button
              onClick={exportToExcel}
              style={{
                padding: '14px 20px',
                background: `linear-gradient(135deg, ${theme.accent} 0%, #b8860b 100%)`,
                border: `2px solid ${theme.accent}80`,
                borderRadius: '10px',
                color: '#000',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: `0 4px 15px ${theme.accent}40`
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 25px ${theme.accent}60`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 15px ${theme.accent}40`;
              }}
            >
              📊 CSV DATA
            </button>
            <button
              onClick={shareWithDoctor}
              style={{
                padding: '14px 20px',
                background: `linear-gradient(135deg, ${theme.primary} 0%, #0d2b2b 100%)`,
                border: `2px solid ${theme.primary}80`,
                borderRadius: '10px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: `0 4px 15px ${theme.primary}40`
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 25px ${theme.primary}60`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 15px ${theme.primary}40`;
              }}
            >
              📧 EMAIL SHARE
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const SettingsView = () => (
    <div>
      <div style={{
        background: `linear-gradient(90deg, ${theme.primary} 0%, ${theme.secondary} 50%, ${theme.primary} 100%)`,
        borderLeft: `8px solid ${theme.accent}`,
        borderRight: `8px solid ${theme.accent}`,
        padding: '20px 30px',
        borderRadius: '8px',
        marginBottom: '30px',
        boxShadow: `0 10px 30px ${theme.accent}40`,
        textAlign: 'center'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: '900',
          color: theme.accent,
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          ⚙️ OPERATIONS COMMAND CENTER ⚙️
        </h2>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        {/* System Information */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.accent}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: theme.accent, textTransform: 'uppercase', margin: 0 }}>
            📡 SYSTEM INFORMATION
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${theme.secondary}40`
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>🪖 Soldier ID</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: theme.accent, fontFamily: 'monospace' }}>nithish900681</p>
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${theme.secondary}40`
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>📅 Current Date & Time</p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: theme.accent, fontFamily: 'monospace' }}>2025-11-21 10:46:52</p>
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${theme.success}40`
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>🟢 System Status</p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: theme.success }}>✓ ONLINE & ACTIVE</p>
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${theme.warning}40`
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>📊 Last Update</p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: theme.warning, fontFamily: 'monospace' }}>
                {lastUpdate ? lastUpdate.toLocaleTimeString() : 'N/A'}
              </p>
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${theme.accent}40`
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>📈 Total Records</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: theme.accent }}>{data.length}</p>
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${theme.secondary}40`
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>🔌 Data Source</p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: theme.secondary }}>Google Sheets API</p>
            </div>
          </div>
        </div>

        {/* Monitoring Configuration */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.secondary}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: theme.secondary, textTransform: 'uppercase', margin: 0 }}>
            🎯 MONITORING CONFIGURATION
          </h3>
          <div style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
            {[
              { name: 'Auto Refresh', desc: 'Update data every 5 seconds', status: true },
              { name: 'Critical Alerts', desc: 'Real-time alert notifications', status: true },
              { name: 'Advanced Analytics', desc: 'AI pattern analysis enabled', status: true },
              { name: 'Health Predictions', desc: 'Predictive health forecasting', status: true },
              { name: 'Stress Monitoring', desc: 'Continuous stress level tracking', status: true },
              { name: 'Auto Sync', desc: 'Background data synchronization', status: true }
            ].map((config, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: `1px solid ${config.status ? theme.success : theme.warning}40`,
                  transition: 'all 0.3s ease'
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
                    {config.name}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                    {config.desc}
                  </p>
                </div>
                <div style={{
                  padding: '6px 14px',
                  background: config.status ? `${theme.success}40` : `${theme.warning}40`,
                  color: config.status ? theme.success : theme.warning,
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  border: `1px solid ${config.status ? theme.success : theme.warning}80`
                }}>
                  {config.status ? '✓ ENABLED' : 'DISABLED'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Health Guidelines */}
        <div style={{
          background: `linear-gradient(135deg, ${theme.primary}30 0%, ${theme.secondary}30 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${theme.accent}40`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: theme.accent, textTransform: 'uppercase', margin: 0 }}>
            💪 SOLDIER WELLNESS GUIDELINES
          </h3>
          <div style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
            <div style={{
              background: `${theme.success}20`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${theme.success}40`,
              borderLeft: `4px solid ${theme.success}`
            }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: theme.success, marginBottom: '6px', textTransform: 'uppercase' }}>🏃 PHYSICAL TRAINING</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                Maintain 150+ minutes of moderate-intensity exercise weekly. Regular PT improves cardiovascular efficiency and operational readiness. Optimal HR zone: 60-100 bpm at rest.
              </p>
            </div>
            <div style={{
              background: `${theme.warning}20`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${theme.warning}40`,
              borderLeft: `4px solid ${theme.warning}`
            }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: theme.warning, marginBottom: '6px', textTransform: 'uppercase' }}>💤 REST & RECOVERY</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                Obtain 7-9 hours of quality sleep daily. Proper sleep cycles regulate heart rate and enhance mission readiness. Sleep deprivation degrades combat effectiveness.
              </p>
            </div>
            <div style={{
              background: `${theme.secondary}20`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${theme.secondary}40`,
              borderLeft: `4px solid ${theme.secondary}`
            }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: theme.secondary, marginBottom: '6px', textTransform: 'uppercase' }}>🍽️ TACTICAL NUTRITION</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                Maintain balanced nutrition with lean proteins, vegetables, and whole grains. Reduce sodium and processed foods. Proper hydration essential for peak performance.
              </p>
            </div>
            <div style={{
              background: `${theme.accent}20`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${theme.accent}40`,
              borderLeft: `4px solid ${theme.accent}`
            }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: theme.accent, marginBottom: '6px', textTransform: 'uppercase' }}>🧘 STRESS MANAGEMENT</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                Practice controlled breathing and meditation techniques. Manage combat stress through tactical resilience training. Stress-induced tachycardia affects mission capability.
              </p>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div style={{
          background: `linear-gradient(135deg, ${theme.primary}40 0%, ${theme.accent}40 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '28px',
          border: `2px solid ${theme.accent}60`,
          boxShadow: `0 10px 40px ${theme.accent}30`,
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '16px', fontSize: '36px' }}>
            ⚔️
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', margin: 0, color: theme.accent, textTransform: 'uppercase', letterSpacing: '2px' }}>
            SOLDIER HEALTH DETECTION SYSTEM
          </h3>
          <p style={{ margin: '12px 0', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
            Advanced Military-Grade AI-Powered Cardiac Health Analytics Platform
          </p>
          <p style={{ margin: '12px 0', fontSize: '12px', color: '#94a3b8' }}>
            Version 2.0 • Real-Time Tactical Health Monitoring • Combat Readiness Assessment
          </p>
          <p style={{ margin: '16px 0 0 0', fontSize: '11px', color: '#64748b', lineHeight: '1.6', fontStyle: 'italic' }}>
            FOR AUTHORIZED MILITARY PERSONNEL ONLY<br/>
            This system provides continuous operational health monitoring. For medical emergencies, immediately contact field medical personnel.<br/>
            All data classified and protected under military health records regulations.
          </p>
        </div>
      </div>
    </div>
  );

  // Loading screen
 // Main render
  return (
    <div style={containerStyle}>
      {/* CRITICAL ALERT POPUP - FULLY RESTORED WITH ALL STYLING */}
      {showCriticalPopup && criticalPopup && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          maxWidth: '450px',
          animation: 'slideInRight 0.5s ease'
        }} onClick={() => setShowCriticalPopup(false)}>
          <div style={{
            background: `linear-gradient(135deg, ${theme.danger} 0%, #8b0000 100%)`,
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '28px',
            border: `2px solid ${theme.accent}`,
            boxShadow: `0 20px 60px ${theme.danger}99, 0 0 0 3px ${theme.accent}40`,
            animation: 'pulse 1.5s ease-in-out infinite',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            <button 
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                color: '#fff',
                fontWeight: '700',
                fontSize: '20px'
              }}
              onClick={() => setShowCriticalPopup(false)}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              ✕
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                fontSize: '40px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}>
                🚨
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  CRITICAL FIELD ALERT
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '600', textTransform: 'uppercase' }}>
                  IMMEDIATE ACTION REQUIRED
                </p>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.15)', borderRadius: '14px', padding: '20px', marginBottom: '20px', borderLeft: `4px solid ${theme.accent}` }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
                ❤️ {criticalPopup.metric}
              </div>
              <div style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.95)', marginBottom: '8px', lineHeight: '1.5', fontWeight: '600' }}>
                {criticalPopup.message}
              </div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: theme.accent, marginTop: '14px', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                {criticalPopup.value}
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.15)', borderRadius: '14px', padding: '18px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                ⚕️ REQUIRED ACTION
              </div>
              <div style={{ fontSize: '14px', color: '#fff', lineHeight: '1.6', fontWeight: '600' }}>
                {criticalPopup.recommendation}
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              <Clock size={16} />
              {criticalPopup.time}
              <span style={{ marginLeft: 'auto' }}>⏳ Auto-closing in 5 seconds...</span>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div style={sidebarStyle}>
        {/* Logo */}
        <div style={{ padding: '25px', borderBottom: `2px solid ${theme.accent}`, background: `linear-gradient(135deg, ${theme.primary}40 0%, ${theme.secondary}40 100%)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <MilitaryBadge />
            {sidebarOpen && (
              <div>
                <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: theme.accent, textTransform: 'uppercase', letterSpacing: '2px' }}>
                  TACTICAL HEALTH
                </h1>
                <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  COMMAND CENTER
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <nav style={{ flex: 1, padding: '20px 10px', overflow: 'auto' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  margin: '8px 0',
                  borderRadius: '10px',
                  border: 'none',
                  background: activePage === item.id 
                    ? `linear-gradient(135deg, ${theme.secondary} 0%, #1a5c2a 100%)`
                    : 'transparent',
                  color: activePage === item.id ? '#fff' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={e => {
                  if (activePage !== item.id) {
                    e.currentTarget.style.background = `${theme.secondary}20`;
                    e.currentTarget.style.color = '#cbd5e1';
                  }
                }}
                onMouseLeave={e => {
                  if (activePage !== item.id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                <Icon size={18} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Toggle Sidebar Button */}
        <div style={{ padding: '20px 10px', borderTop: `2px solid ${theme.accent}80` }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              border: `2px solid ${theme.accent}60`,
              background: `${theme.accent}20`,
              color: theme.accent,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              fontWeight: '700',
              fontSize: '13px',
              textTransform: 'uppercase'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${theme.accent}40`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = `${theme.accent}20`;
            }}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            {sidebarOpen && 'COLLAPSE'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={mainContentStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>
              {activePage === 'dashboard' && '🎖️ COMMAND CENTER'}
              {activePage === 'analytics' && '📡 INTELLIGENCE'}
              {activePage === 'vitals' && '💪 FIELD STATUS'}
              {activePage === 'reports' && '📜 DISPATCHES'}
              {activePage === 'settings' && '⚙️ OPS CONTROL'}
            </h2>
            <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Real-Time Soldier Health Monitoring • Combat Readiness Status
            </p>
          </div>
          <button
            onClick={fetchSheetData}
            style={{
              padding: '12px 24px',
              background: `linear-gradient(135deg, ${theme.accent} 0%, #b8860b 100%)`,
              border: `2px solid ${theme.accent}80`,
              borderRadius: '10px',
              color: '#000',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: `0 4px 15px ${theme.accent}40`
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 8px 25px ${theme.accent}60`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 15px ${theme.accent}40`;
            }}
          >
            <RefreshCw size={16} />
            SYNC DATA
          </button>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {activePage === 'dashboard' && <DashboardView />}
          {activePage === 'analytics' && <AnalyticsView />}
          {activePage === 'vitals' && <VitalsView />}
          {activePage === 'reports' && <ReportsView />}
          {activePage === 'settings' && <SettingsView />}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.03); }
        }
        @keyframes slideInRight {
          from { 
            opacity: 0;
            transform: translateX(400px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse-border {
          0%, 100% { 
            opacity: 0.3;
            transform: scale(1);
          }
          50% { 
            opacity: 0.1;
            transform: scale(1.1);
          }
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(212, 175, 55, 0.4) rgba(44, 95, 45, 0.1);
        }
        *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        *::-webkit-scrollbar-track {
          background: rgba(44, 95, 45, 0.1);
          border-radius: 10px;
        }
        *::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.4);
          border-radius: 10px;
        }
        *::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.6);
        }
      `}</style>
    </div>
  );
};

export default SoldierHealthDashboard;