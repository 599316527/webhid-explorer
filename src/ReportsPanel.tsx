import { useState, useRef } from 'react';
import { parseHexArray } from './utils';
import type { InputReportEntry } from './useWebHID';

interface Props {
  inputReports: InputReportEntry[];
  clearReports: () => void;
  sendOutputReport: (reportId: number, data: Uint8Array) => Promise<void>;
  sendFeatureReport: (reportId: number, data: Uint8Array) => Promise<void>;
  receiveFeatureReport: (reportId: number) => Promise<string | null>;
}

export default function ReportsPanel({ inputReports, clearReports, sendOutputReport, sendFeatureReport, receiveFeatureReport }: Props) {
  const [featureValue, setFeatureValue] = useState('');
  const outputRef = useRef<HTMLInputElement>(null);

  const handleSendOutput = () => {
    const data = parseHexArray(outputRef.current?.value || '');
    if (!data) return;
    const reportId = data.getUint8(0);
    const reportData = new Uint8Array(data.buffer).slice(1);
    sendOutputReport(reportId, reportData);
  };

  const handleSendFeature = () => {
    const data = parseHexArray(featureValue);
    if (!data) return;
    const reportId = data.getUint8(0);
    const reportData = new Uint8Array(data.buffer).slice(1);
    sendFeatureReport(reportId, reportData);
  };

  const handleRecvFeature = async () => {
    const data = parseHexArray(featureValue);
    if (!data) return;
    const reportId = data.getUint8(0);
    const result = await receiveFeatureReport(reportId);
    if (result) setFeatureValue(result);
  };

  return (
    <div className="panel panel-right">
      <div className="report-section input-reports">
        <div className="panel-header">
          <span>Input Reports</span>
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{inputReports.length}</span>
          <button onClick={clearReports}>Clear</button>
        </div>
        <div className="report-content">
          {inputReports.map(r => (
            <div key={r.id} className="report-entry">
              <span className="timestamp">{r.timestamp}</span>
              <span className="data">{r.data}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="report-section output-reports">
        <div className="panel-header"><span>Output Report</span></div>
        <div className="report-send-area">
          <input ref={outputRef} type="text" placeholder="Report ID + Data (hex, e.g. 01 FF 00)" />
          <button onClick={handleSendOutput}>Send</button>
        </div>
      </div>

      <div className="report-section feature-reports">
        <div className="panel-header"><span>Feature Report</span></div>
        <div className="report-send-area">
          <input value={featureValue} onChange={e => setFeatureValue(e.target.value)} type="text" placeholder="Report ID + Data (hex)" />
          <button onClick={handleSendFeature}>Send</button>
          <button onClick={handleRecvFeature}>Receive</button>
        </div>
      </div>
    </div>
  );
}
