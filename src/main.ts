import './style.css';
import { vendorName, usageName } from './hid-data';

const hex8 = (value: number) => `00${value.toString(16)}`.substr(-2).toUpperCase();
const hex16 = (value: number) => `0000${value.toString(16)}`.substr(-4).toUpperCase();

interface InputReportEntry {
  timestamp: string;
  data: string;
  reportId: number;
}

let connectedDevices: HIDDevice[] = [];
let selectedDevice: HIDDevice | null = null;
let inputReports: InputReportEntry[] = [];
const MAX_INPUT_REPORTS = 100;

const app = document.getElementById('app')!;

function render() {
  app.innerHTML = `
    <div class="toolbar">
      <h1>HID Explorer</h1>
      <button id="connectBtn">Connect</button>
      <select id="deviceSelect"></select>
    </div>
    <div class="main-content">
      <div class="panel panel-left">
        <div class="device-meta" id="deviceMeta"></div>
        <div class="panel-header">
          <span>Descriptor</span>
          <select id="outlineSelect"><option value="">— Outline —</option></select>
        </div>
        <div class="descriptor-content" id="descriptorContent">
          <div class="no-device" id="noDeviceMsg">Connect a device to view its descriptor</div>
        </div>
      </div>
      <div class="panel panel-right">
        <div class="report-section input-reports">
          <div class="panel-header">
            <span>Input Reports</span>
            <span id="inputCount" style="margin-left:auto;color:var(--text-muted)">0</span>
            <button id="clearInputBtn">Clear</button>
          </div>
          <div class="report-content" id="inputReportContent"></div>
        </div>
        <div class="report-section output-reports">
          <div class="panel-header"><span>Output Report</span></div>
          <div class="report-send-area">
            <input id="outputReportInput" type="text" placeholder="Report ID + Data (hex, e.g. 01 FF 00)" />
            <button id="sendOutputBtn">Send</button>
          </div>
        </div>
        <div class="report-section feature-reports">
          <div class="panel-header"><span>Feature Report</span></div>
          <div class="report-send-area">
            <input id="featureReportInput" type="text" placeholder="Report ID + Data (hex)" />
            <button id="sendFeatureBtn">Send</button>
            <button id="recvFeatureBtn">Receive</button>
          </div>
        </div>
      </div>
    </div>
  `;
  bindEvents();
  updateDeviceMenu();
}

function bindEvents() {
  document.getElementById('connectBtn')!.addEventListener('click', connectDevice);
  document.getElementById('deviceSelect')!.addEventListener('change', deviceSelectionChanged);
  document.getElementById('clearInputBtn')!.addEventListener('click', clearInputReports);
  document.getElementById('sendOutputBtn')!.addEventListener('click', sendOutputReport);
  document.getElementById('sendFeatureBtn')!.addEventListener('click', sendFeatureReport);
  document.getElementById('recvFeatureBtn')!.addEventListener('click', receiveFeatureReport);
  document.getElementById('outlineSelect')!.addEventListener('change', outlineJump);
}

async function connectDevice() {
  const devices = await navigator.hid.requestDevice({ filters: [] });
  for (const device of devices) {
    await addDevice(device);
  }
}

async function addDevice(device: HIDDevice) {
  if (connectedDevices.includes(device)) return;
  connectedDevices.push(device);
  if (!selectedDevice) await selectDevice(device);
  updateDeviceMenu();
}

function removeDevice(device: HIDDevice) {
  if (device === selectedDevice) selectedDevice = null;
  connectedDevices = connectedDevices.filter(d => d !== device);
  updateDeviceMenu();
  if (!selectedDevice && connectedDevices.length > 0) {
    selectDevice(connectedDevices[0]);
  } else {
    updateDescriptor();
  }
}

function updateDeviceMenu() {
  const select = document.getElementById('deviceSelect') as HTMLSelectElement;
  if (!select) return;
  select.innerHTML = '';
  if (connectedDevices.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No connected devices';
    select.appendChild(opt);
    return;
  }
  connectedDevices.forEach((device, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = device.productName || `Device ${i}`;
    if (device === selectedDevice) opt.selected = true;
    select.appendChild(opt);
  });
}

function deviceSelectionChanged() {
  const select = document.getElementById('deviceSelect') as HTMLSelectElement;
  const idx = parseInt(select.value);
  if (connectedDevices[idx]) selectDevice(connectedDevices[idx]);
}

async function selectDevice(device: HIDDevice) {
  if (selectedDevice) selectedDevice.oninputreport = null;
  selectedDevice = device;
  if (selectedDevice) {
    selectedDevice.oninputreport = handleInputReport;
    if (!selectedDevice.opened) {
      try { await selectedDevice.open(); } catch (e) {
        console.error('Error opening device:', e);
      }
    }
  }
  inputReports = [];
  updateDescriptor();
  updateInputReportDisplay();
}

function handleInputReport(event: HIDInputReportEvent) {
  const now = new Date();
  const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
  let buffer = hex8(event.reportId);
  const reportData = new Uint8Array(event.data.buffer);
  for (const byte of reportData) buffer += ' ' + hex8(byte);

  inputReports.unshift({ timestamp: ts, data: buffer, reportId: event.reportId });
  if (inputReports.length > MAX_INPUT_REPORTS) inputReports.pop();
  updateInputReportDisplay();
}

function updateInputReportDisplay() {
  const container = document.getElementById('inputReportContent');
  const countEl = document.getElementById('inputCount');
  if (!container || !countEl) return;
  countEl.textContent = String(inputReports.length);
  container.innerHTML = inputReports.map(r =>
    `<div class="report-entry"><span class="timestamp">${r.timestamp}</span><span class="data">${r.data}</span></div>`
  ).join('');
}

function clearInputReports() {
  inputReports = [];
  updateInputReportDisplay();
}

function sendOutputReport() {
  if (!selectedDevice) return;
  const input = document.getElementById('outputReportInput') as HTMLInputElement;
  const data = parseHexArray(input.value);
  if (!data) return;
  const reportId = data.getUint8(0);
  const reportData = new Uint8Array(data.buffer).slice(1);
  selectedDevice.sendReport(reportId, reportData);
}

function sendFeatureReport() {
  if (!selectedDevice) return;
  const input = document.getElementById('featureReportInput') as HTMLInputElement;
  const data = parseHexArray(input.value);
  if (!data) return;
  const reportId = data.getUint8(0);
  const reportData = new Uint8Array(data.buffer).slice(1);
  selectedDevice.sendFeatureReport(reportId, reportData);
}

async function receiveFeatureReport() {
  if (!selectedDevice) return;
  const input = document.getElementById('featureReportInput') as HTMLInputElement;
  const data = parseHexArray(input.value);
  if (!data) return;
  const reportId = data.getUint8(0);
  const result = await selectedDevice.receiveFeatureReport(reportId);
  let buffer = hex8(reportId);
  const resultData = new Uint8Array(result.buffer);
  for (const byte of resultData) buffer += ' ' + hex8(byte);
  input.value = buffer;
}

function parseHexArray(text: string): DataView | null {
  text = text.replace(/[^0-9a-fA-F]/g, '');
  if (text.length % 2 || text.length === 0) return null;
  const u8 = new Uint8Array(text.length / 2);
  for (let i = 0; i < text.length; i += 2)
    u8[i / 2] = parseInt(text.substr(i, 2), 16);
  return new DataView(u8.buffer);
}

function outlineJump() {
  const select = document.getElementById('outlineSelect') as HTMLSelectElement;
  const targetId = select.value;
  if (!targetId) return;
  const el = document.getElementById(targetId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('highlight-flash');
    setTimeout(() => el.classList.remove('highlight-flash'), 600);
  }
}

// ===== Descriptor rendering =====

interface OutlineEntry {
  id: string;
  label: string;
  indent: number;
}

function updateDescriptor() {
  const container = document.getElementById('descriptorContent')!;
  const metaEl = document.getElementById('deviceMeta')!;
  const outlineSelect = document.getElementById('outlineSelect') as HTMLSelectElement;

  if (!selectedDevice) {
    container.innerHTML = '<div class="no-device">Connect a device to view its descriptor</div>';
    metaEl.innerHTML = '';
    outlineSelect.innerHTML = '<option value="">— Outline —</option>';
    return;
  }

  metaEl.innerHTML = `
    <span><span class="label">Product: </span><span class="value">${selectedDevice.productName}</span></span>
    <span><span class="label">Vendor: </span><span class="value">0x${hex16(selectedDevice.vendorId)} ${vendorName(selectedDevice.vendorId)}</span></span>
    <span><span class="label">Product ID: </span><span class="value">0x${hex16(selectedDevice.productId)}</span></span>
  `;

  const outlineEntries: OutlineEntry[] = [];
  let html = '';

  if (selectedDevice.collections.length === 0) {
    html = '<div class="no-device">No collections</div>';
  } else {
    for (let ci = 0; ci < selectedDevice.collections.length; ci++) {
      const c = selectedDevice.collections[ci];
      const collId = `coll-${ci}`;
      const collUsage = usageName((c.usagePage << 16) + c.usage);
      outlineEntries.push({ id: collId, label: `Collection ${ci}: ${collUsage}`, indent: 0 });

      html += `<div class="desc-collection" id="${collId}">`;
      html += `<div class="desc-collection-header">▸ Collection ${ci}: ${collUsage}</div>`;
      html += '<div class="desc-node">';

      // List report IDs in collection with links
      const reportIdLinks: string[] = [];
      for (const r of c.inputReports) {
        reportIdLinks.push(`<span class="desc-report-id-ref" data-target="report-input-${r.reportId}">Input 0x${hex8(r.reportId)}</span>`);
      }
      for (const r of c.outputReports) {
        reportIdLinks.push(`<span class="desc-report-id-ref" data-target="report-output-${r.reportId}">Output 0x${hex8(r.reportId)}</span>`);
      }
      for (const r of c.featureReports) {
        reportIdLinks.push(`<span class="desc-report-id-ref" data-target="report-feature-${r.reportId}">Feature 0x${hex8(r.reportId)}</span>`);
      }
      if (reportIdLinks.length > 0) {
        html += `<div class="desc-item" style="margin-bottom:4px">Reports: ${reportIdLinks.join(' ')}</div>`;
      }

      // Input reports
      for (const r of c.inputReports) {
        const rid = `report-input-${r.reportId}`;
        outlineEntries.push({ id: rid, label: `  Input Report 0x${hex8(r.reportId)}`, indent: 1 });
        html += renderReport(r, 'input', ci);
      }
      // Output reports
      for (const r of c.outputReports) {
        const rid = `report-output-${r.reportId}`;
        outlineEntries.push({ id: rid, label: `  Output Report 0x${hex8(r.reportId)}`, indent: 1 });
        html += renderReport(r, 'output', ci);
      }
      // Feature reports
      for (const r of c.featureReports) {
        const rid = `report-feature-${r.reportId}`;
        outlineEntries.push({ id: rid, label: `  Feature Report 0x${hex8(r.reportId)}`, indent: 1 });
        html += renderReport(r, 'feature', ci);
      }

      html += '</div></div>';
    }
  }

  container.innerHTML = html;

  // Build outline dropdown
  outlineSelect.innerHTML = '<option value="">— Outline —</option>';
  for (const entry of outlineEntries) {
    const opt = document.createElement('option');
    opt.value = entry.id;
    opt.textContent = entry.label;
    outlineSelect.appendChild(opt);
  }

  // Bind click events for report ID links
  container.querySelectorAll('.desc-report-id-ref').forEach(el => {
    el.addEventListener('click', () => {
      const target = (el as HTMLElement).dataset.target;
      if (target) {
        const targetEl = document.getElementById(target);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          targetEl.classList.add('highlight-flash');
          setTimeout(() => targetEl.classList.remove('highlight-flash'), 600);
        }
      }
    });
  });

  // Bind click events for collection back-links
  container.querySelectorAll('.link-back-to-coll').forEach(el => {
    el.addEventListener('click', () => {
      const target = (el as HTMLElement).dataset.target;
      if (target) {
        const targetEl = document.getElementById(target);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          targetEl.classList.add('highlight-flash');
          setTimeout(() => targetEl.classList.remove('highlight-flash'), 600);
        }
      }
    });
  });
}

function renderReport(report: HIDReportInfo, type: string, collIndex: number): string {
  const rid = `report-${type}-${report.reportId}`;
  const collId = `coll-${collIndex}`;
  let html = `<div class="desc-report-header ${type}" id="${rid}">`;
  html += `${type.charAt(0).toUpperCase() + type.slice(1)} Report 0x${hex8(report.reportId)}`;
  html += ` <span class="link-back-to-coll link-anchor" data-target="${collId}" style="font-size:10px;font-weight:normal;color:var(--text-muted)">[↑ Collection ${collIndex}]</span>`;
  html += '</div>';
  html += '<div class="desc-node">';

  let bitOffset = 0;
  for (const item of report.items) {
    html += renderItem(item, bitOffset);
    bitOffset += item.reportSize * item.reportCount;
  }

  html += '</div>';
  return html;
}

function renderItem(item: HIDReportItem, startBit: number): string {
  const bitWidth = item.reportCount * item.reportSize;
  const endBit = startBit + bitWidth - 1;

  let sizeStr: string;
  if (bitWidth === 1) {
    sizeStr = `1 bit (bit ${startBit})`;
  } else if (item.reportCount === 1) {
    sizeStr = `${item.reportSize} bits (${startBit}–${endBit})`;
  } else {
    sizeStr = `${item.reportCount}×${item.reportSize} bits (${startBit}–${endBit})`;
  }

  const flags = buildFlags(item);
  const usageStr = buildUsageString(item);
  const boundsStr = `Logical: ${item.logicalMinimum}…${item.logicalMaximum}`;

  let html = '<div class="desc-item">';
  html += `<span class="desc-item-bits">${sizeStr}</span>`;
  html += `<span class="desc-item-flags">${flags.map(f => `<span class="desc-flag">${f}</span>`).join('')}</span>`;
  if (usageStr) html += `<br><span class="desc-item-usage">${usageStr}</span>`;
  html += `<br><span class="desc-item-bounds">${boundsStr}</span>`;

  if (hasPhysicalBounds(item)) {
    html += ` <span class="desc-item-bounds">Physical: ${item.physicalMinimum}…${item.physicalMaximum}</span>`;
  }
  if (hasUnitDefinition(item)) {
    html += ` <span class="desc-item-bounds">Unit: ${unitsAsString(item)}</span>`;
  }

  html += '</div>';
  return html;
}

function buildFlags(item: HIDReportItem): string[] {
  const bits: string[] = [];
  bits.push(item.isConstant ? 'Cnst' : 'Data');
  bits.push(item.isArray ? 'Ary' : 'Var');
  bits.push(item.isAbsolute ? 'Abs' : 'Rel');
  if (item.wrap) bits.push('Wrap');
  if (!item.isLinear) bits.push('NLin');
  if (!item.hasPreferredState) bits.push('NPrf');
  if (item.hasNull) bits.push('Null');
  if (item.isVolatile) bits.push('Vol');
  if (item.isBufferedBytes) bits.push('Buf');
  return bits;
}

function buildUsageString(item: HIDReportItem): string {
  if (item.isRange) {
    if (item.usageMinimum === item.usageMaximum) return usageName(item.usageMinimum);
    return `${usageName(item.usageMinimum)} → ${usageName(item.usageMaximum)}`;
  }
  if (item.usages.length === 0) return '';
  if (item.usages.length === 1) return usageName(item.usages[0]);
  return item.usages.map(u => usageName(u)).join(', ');
}

function hasPhysicalBounds(item: HIDReportItem): boolean {
  return item.physicalMinimum !== 0 || item.physicalMaximum !== item.physicalMinimum;
}

function hasUnitDefinition(item: HIDReportItem): boolean {
  return item.unitFactorLengthExponent !== 0 ||
    item.unitFactorMassExponent !== 0 ||
    item.unitFactorTimeExponent !== 0 ||
    item.unitFactorTemperatureExponent !== 0 ||
    item.unitFactorCurrentExponent !== 0 ||
    item.unitFactorLuminousIntensityExponent !== 0 ||
    item.unitExponent !== 0 ||
    item.unitSystem !== 'none';
}

function unitsAsString(item: HIDReportItem): string {
  let lengthName: string, massName: string, timeName: string, temperatureName: string, currentName: string, luminousIntensityName: string;
  if (item.unitSystem === 'si-linear') {
    lengthName = 'cm'; massName = 'g'; timeName = 's'; temperatureName = 'K'; currentName = 'A'; luminousIntensityName = 'cd';
  } else if (item.unitSystem === 'si-rotation') {
    lengthName = 'rad'; massName = 'g'; timeName = 's'; temperatureName = 'K'; currentName = 'A'; luminousIntensityName = 'cd';
  } else if (item.unitSystem === 'english-linear') {
    lengthName = 'in'; massName = 'slug'; timeName = 's'; temperatureName = '°F'; currentName = 'A'; luminousIntensityName = 'cd';
  } else if (item.unitSystem === 'english-rotation') {
    lengthName = 'deg'; massName = 'slug'; timeName = 's'; temperatureName = '°F'; currentName = 'A'; luminousIntensityName = 'cd';
  } else {
    lengthName = 'length'; massName = 'mass'; timeName = 'time'; temperatureName = 'temperature'; currentName = 'current'; luminousIntensityName = 'luminous-intensity';
  }

  const numerator: string[] = [];
  const denominator: string[] = [];
  addUnitFactor(numerator, denominator, lengthName, item.unitFactorLengthExponent);
  addUnitFactor(numerator, denominator, massName, item.unitFactorMassExponent);
  addUnitFactor(numerator, denominator, timeName, item.unitFactorTimeExponent);
  addUnitFactor(numerator, denominator, temperatureName, item.unitFactorTemperatureExponent);
  addUnitFactor(numerator, denominator, currentName, item.unitFactorCurrentExponent);
  addUnitFactor(numerator, denominator, luminousIntensityName, item.unitFactorLuminousIntensityExponent);

  const exp = item.unitExponent === 0 ? '' : `10^${item.unitExponent}·`;
  const num = numerator.length > 0 ? numerator.join('·') : '1';
  if (denominator.length === 0) return `${exp}${num}`;
  return `${exp}${num}/${denominator.join('·')}`;
}

function addUnitFactor(numerator: string[], denominator: string[], name: string, exponent: number) {
  if (exponent === 0) return;
  const absExp = Math.abs(exponent);
  const expStr = absExp === 1 ? '' : `^${absExp}`;
  if (exponent > 0) numerator.push(name + expStr);
  else denominator.push(name + expStr);
}

// Initialize
render();

navigator.hid.addEventListener('connect', (e: HIDConnectionEvent) => addDevice(e.device));
navigator.hid.addEventListener('disconnect', (e: HIDConnectionEvent) => removeDevice(e.device));

(async () => {
  const devices = await navigator.hid.getDevices();
  for (const device of devices) await addDevice(device);
})();
