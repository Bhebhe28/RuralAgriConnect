import React, { useState } from 'react';
import api from '../api/client';

type ExportType = 'farmers' | 'yields' | 'subsidies' | 'outbreaks' | 'advisories' | 'fields';

interface ExportConfig {
  type: ExportType;
  icon: string;
  label: string;
  desc: string;
  endpoint: string;
}

const EXPORTS: ExportConfig[] = [
  { type: 'farmers',    icon: '👥', label: 'Farmer Register',      desc: 'All registered farmers with region, crops, and contact details', endpoint: '/users' },
  { type: 'advisories', icon: '📋', label: 'Advisory Report',      desc: 'All published crop advisories with severity and region', endpoint: '/advisories' },
  { type: 'yields',     icon: '🌾', label: 'Yield Report',         desc: 'Harvest data by farmer, crop, region, and season', endpoint: '/yields' },
  { type: 'subsidies',  icon: '📦', label: 'Resource Requests',    desc: 'All subsidy/resource requests with approval status', endpoint: '/subsidies' },
  { type: 'outbreaks',  icon: '🦠', label: 'Outbreak Report',      desc: 'Pest and disease outbreaks by region and severity', endpoint: '/outbreaks' },
  { type: 'fields',     icon: '🗺️', label: 'Field Registration',   desc: 'All registered farm fields with GPS and crop data', endpoint: '/fields' },
];

function toCSV(data: any[], type: ExportType): string {
  if (!data.length) return 'No data available';

  const fieldMaps: Record<ExportType, string[]> = {
    farmers:    ['name', 'email', 'phone', 'role', 'region', 'created_at'],
    advisories: ['title', 'crop_type', 'region', 'severity', 'author_name', 'created_at'],
    yields:     ['farmer_name', 'season', 'crop_type', 'region', 'area_hectares', 'yield_kg', 'quality', 'reported_at'],
    subsidies:  ['farmer_name', 'farmer_region', 'resource_type', 'quantity', 'reason', 'status', 'review_notes', 'created_at'],
    outbreaks:  ['region', 'crop_type', 'description', 'severity', 'reported_by_name', 'reported_date'],
    fields:     ['farmer_name', 'farmer_region', 'field_name', 'crop_type', 'area_hectares', 'soil_type', 'irrigation', 'gps_lat', 'gps_lng'],
  };

  const cols = fieldMaps[type];
  const header = cols.join(',');
  const rows = data.map(row =>
    cols.map(col => {
      const val = row[col] ?? '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

function toPrintHTML(data: any[], config: ExportConfig): string {
  if (!data.length) return '<p>No data available</p>';

  const fieldMaps: Record<ExportType, { key: string; label: string }[]> = {
    farmers:    [{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'role', label: 'Role' }, { key: 'region', label: 'Region' }, { key: 'created_at', label: 'Joined' }],
    advisories: [{ key: 'title', label: 'Title' }, { key: 'crop_type', label: 'Crop' }, { key: 'region', label: 'Region' }, { key: 'severity', label: 'Severity' }, { key: 'author_name', label: 'Author' }, { key: 'created_at', label: 'Date' }],
    yields:     [{ key: 'farmer_name', label: 'Farmer' }, { key: 'season', label: 'Season' }, { key: 'crop_type', label: 'Crop' }, { key: 'region', label: 'Region' }, { key: 'area_hectares', label: 'Hectares' }, { key: 'yield_kg', label: 'Yield (kg)' }, { key: 'quality', label: 'Quality' }],
    subsidies:  [{ key: 'farmer_name', label: 'Farmer' }, { key: 'farmer_region', label: 'Region' }, { key: 'resource_type', label: 'Resource' }, { key: 'quantity', label: 'Quantity' }, { key: 'status', label: 'Status' }, { key: 'review_notes', label: 'Notes' }],
    outbreaks:  [{ key: 'region', label: 'Region' }, { key: 'crop_type', label: 'Crop' }, { key: 'description', label: 'Description' }, { key: 'severity', label: 'Severity' }, { key: 'reported_date', label: 'Date' }],
    fields:     [{ key: 'farmer_name', label: 'Farmer' }, { key: 'field_name', label: 'Field' }, { key: 'crop_type', label: 'Crop' }, { key: 'area_hectares', label: 'Hectares' }, { key: 'soil_type', label: 'Soil' }, { key: 'irrigation', label: 'Irrigation' }],
  };

  const cols = fieldMaps[config.type];
  const now = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
    <!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>RurAgriConnect — ${config.label}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; color: #0D1F17; margin: 20px; }
      .header { border-bottom: 3px solid #1B4332; padding-bottom: 12px; margin-bottom: 16px; }
      .header h1 { color: #1B4332; font-size: 18px; margin: 0 0 4px; }
      .header p { color: #6B7C6E; margin: 0; font-size: 10px; }
      .meta { display: flex; gap: 20px; margin-bottom: 16px; font-size: 10px; color: #6B7C6E; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #1B4332; color: white; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
      td { padding: 7px 10px; border-bottom: 1px solid #EDE8DF; }
      tr:nth-child(even) td { background: #F8F4EE; }
      .footer { margin-top: 20px; font-size: 9px; color: #6B7C6E; border-top: 1px solid #EDE8DF; padding-top: 8px; }
      @media print { body { margin: 10px; } }
    </style>
    </head><body>
    <div class="header">
      <h1>🌿 RurAgriConnect — ${config.label}</h1>
      <p>KwaZulu-Natal Municipal Agricultural Advisory System</p>
    </div>
    <div class="meta">
      <span>📅 Generated: ${now}</span>
      <span>📊 Total Records: ${data.length}</span>
    </div>
    <table>
      <thead><tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
      <tbody>
        ${data.map(row => `<tr>${cols.map(c => `<td>${row[c.key] ?? '—'}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
    <div class="footer">
      RurAgriConnect · KwaZulu-Natal Offline Farm Advisory System · Confidential Municipal Report
    </div>
    </body></html>
  `;
}

export default function ExportReports() {
  const [loading, setLoading] = useState<ExportType | null>(null);
  const [message, setMessage] = useState('');

  const handleExport = async (config: ExportConfig, format: 'csv' | 'pdf') => {
    setLoading(config.type);
    setMessage('');
    try {
      const data = await api.get(config.endpoint).then(r => r.data);
      const arr = Array.isArray(data) ? data : data.advisories || data.reports || [];

      if (format === 'csv') {
        const csv = toCSV(arr, config.type);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ruragriconnect_${config.type}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage(`✅ ${config.label} exported as CSV (${arr.length} records)`);
      } else {
        const html = toPrintHTML(arr, config);
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
          setTimeout(() => { win.print(); }, 500);
        }
        setMessage(`✅ ${config.label} opened for printing (${arr.length} records)`);
      }
    } catch (err: any) {
      setMessage(`❌ Export failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(null);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div className="p-4 md:p-7 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-serif">📤 Export Reports</h2>
        <p className="text-sm text-muted mt-0.5">Download data as CSV or print as PDF for municipality council meetings</p>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 mb-5 text-sm border animate-fade-in ${
          message.startsWith('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>{message}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORTS.map(config => (
          <div key={config.type} className="card mb-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-forest/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-dark">{config.label}</h3>
                <p className="text-xs text-muted mt-0.5 mb-4">{config.desc}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport(config, 'csv')}
                    disabled={loading === config.type}
                    className="btn-outline text-xs px-4 py-2 flex-1 disabled:opacity-50">
                    {loading === config.type ? '⏳ Exporting…' : '📥 Download CSV'}
                  </button>
                  <button
                    onClick={() => handleExport(config, 'pdf')}
                    disabled={loading === config.type}
                    className="btn-primary text-xs px-4 py-2 flex-1 disabled:opacity-50">
                    {loading === config.type ? '⏳ Preparing…' : '🖨️ Print / PDF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-5 bg-forest/5 border border-forest/20">
        <div className="flex gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-semibold text-forest text-sm">How to save as PDF</p>
            <p className="text-xs text-muted mt-1">Click "Print / PDF" → In the print dialog, change the destination to "Save as PDF" → Click Save. This works on all browsers and creates a professional municipality report.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
