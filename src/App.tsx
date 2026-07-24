import { useTheme } from './useTheme';
import { useWebHID } from './useWebHID';
import DescriptorPanel from './DescriptorPanel';
import ReportsPanel from './ReportsPanel';

export default function App() {
  const { theme, toggle } = useTheme();
  const {
    devices, selectedDevice, selectDevice, connect,
    inputReports, clearReports,
    sendOutputReport, sendFeatureReport, receiveFeatureReport,
  } = useWebHID();

  return (
    <>
      <div className="toolbar">
        <h1>HID Explorer</h1>
        <button onClick={connect}>Connect</button>
        <select
          value={devices.indexOf(selectedDevice!)}
          onChange={e => selectDevice(devices[+e.target.value] || null)}
        >
          {devices.length === 0 && <option>No connected devices</option>}
          {devices.map((d, i) => <option key={i} value={i}>{d.productName || `Device ${i}`}</option>)}
        </select>
        <button className="theme-toggle" onClick={toggle}>
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
      <div className="main-content">
        <DescriptorPanel device={selectedDevice} />
        <ReportsPanel
          inputReports={inputReports}
          clearReports={clearReports}
          sendOutputReport={sendOutputReport}
          sendFeatureReport={sendFeatureReport}
          receiveFeatureReport={receiveFeatureReport}
        />
      </div>
    </>
  );
}
