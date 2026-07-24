import { useState, useRef, useCallback } from 'react';
import { parseHexArray } from './utils';
import type { InputReportEntry } from './useWebHID';

interface Props {
  inputReports: InputReportEntry[];
  clearReports: () => void;
  sendOutputReport: (reportId: number, data: Uint8Array) => Promise<void>;
  sendFeatureReport: (reportId: number, data: Uint8Array) => Promise<void>;
  receiveFeatureReport: (reportId: number) => Promise<string | null>;
}

function useDragResize(initialSizes: number[]) {
  const [sizes, setSizes] = useState(initialSizes);
  const dragging = useRef<{ index: number; startY: number; startSizes: number[] } | null>(null);

  const onMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startSizes = [...sizes];
    dragging.current = { index, startY, startSizes };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = ev.clientY - dragging.current.startY;
      const container = (e.target as HTMLElement).parentElement!;
      const totalHeight = container.getBoundingClientRect().height;
      const deltaPercent = (delta / totalHeight) * 100;

      const newSizes = [...dragging.current.startSizes];
      const minSize = 5;
      newSizes[dragging.current.index] = Math.max(minSize, newSizes[dragging.current.index] + deltaPercent);
      newSizes[dragging.current.index + 1] = Math.max(minSize, newSizes[dragging.current.index + 1] - deltaPercent);
      setSizes(newSizes);
    };

    const onMouseUp = () => {
      dragging.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sizes]);

  return { sizes, onMouseDown };
}

export default function ReportsPanel({ inputReports, clearReports, sendOutputReport, sendFeatureReport, receiveFeatureReport }: Props) {
  const [featureValue, setFeatureValue] = useState('');
  const [featureResponse, setFeatureResponse] = useState('');
  const outputRef = useRef<HTMLInputElement>(null);
  const { sizes, onMouseDown } = useDragResize([60, 15, 25]);

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
    if (result) setFeatureResponse(result);
  };

  return (
    <div className="panel panel-right">
      <div className="report-section" style={{ flex: `${sizes[0]} 0 0` }}>
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

      <div className="resize-handle" onMouseDown={e => onMouseDown(0, e)} />

      <div className="report-section" style={{ flex: `${sizes[1]} 0 0` }}>
        <div className="panel-header"><span>Output Report</span></div>
        <div className="report-send-area">
          <input ref={outputRef} type="text" placeholder="Report ID + Data (hex, e.g. 01 FF 00)" />
          <button onClick={handleSendOutput}>Send</button>
        </div>
      </div>

      <div className="resize-handle" onMouseDown={e => onMouseDown(1, e)} />

      <div className="report-section" style={{ flex: `${sizes[2]} 0 0` }}>
        <div className="panel-header"><span>Feature Report</span></div>
        <div className="report-send-area">
          <input value={featureValue} onChange={e => setFeatureValue(e.target.value)} type="text" placeholder="Report ID + Data (hex)" />
          <button onClick={handleSendFeature}>Send</button>
          <button onClick={handleRecvFeature}>Receive</button>
        </div>
        {featureResponse && (
          <div className="feature-response">
            <span className="label">Response:</span>
            <span className="data">{featureResponse}</span>
          </div>
        )}
      </div>
    </div>
  );
}
