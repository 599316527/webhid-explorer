import { useMemo } from 'react';
import { hex8, hex16, scrollToElement } from './utils';
import { vendorName, usageName } from './hid-data';

interface Props {
  device: HIDDevice | null;
}

interface OutlineEntry {
  id: string;
  label: string;
}

export default function DescriptorPanel({ device }: Props) {
  const { outline, content } = useMemo(() => buildDescriptor(device), [device]);

  const onOutlineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) scrollToElement(e.target.value);
    e.target.value = '';
  };

  return (
    <div className="panel panel-left">
      {device && (
        <div className="device-meta">
          <span><span className="label">Product: </span><span className="value">{device.productName}</span></span>
          <span><span className="label">Vendor: </span><span className="value">0x{hex16(device.vendorId)} {vendorName(device.vendorId)}</span></span>
          <span><span className="label">Product ID: </span><span className="value">0x{hex16(device.productId)}</span></span>
        </div>
      )}
      <div className="panel-header">
        <span>Descriptor</span>
        <select onChange={onOutlineChange} defaultValue="">
          <option value="">— Outline —</option>
          {outline.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </div>
      <div className="descriptor-content">
        {!device ? (
          <div className="no-device">Connect a device to view its descriptor</div>
        ) : content}
      </div>
    </div>
  );
}

function buildDescriptor(device: HIDDevice | null): { outline: OutlineEntry[]; content: React.ReactNode } {
  if (!device || device.collections.length === 0) return { outline: [], content: null };

  const outline: OutlineEntry[] = [];
  const collections = device.collections.map((c, ci) => {
    const collId = `coll-${ci}`;
    const collUsage = usageName((c.usagePage << 16) + c.usage);
    outline.push({ id: collId, label: `Collection ${ci}: ${collUsage}` });

    const reportLinks: React.ReactNode[] = [];
    c.inputReports.forEach(r => reportLinks.push(
      <span key={`i-${r.reportId}`} className="link-ref" onClick={() => scrollToElement(`report-input-${r.reportId}`)}>Input 0x{hex8(r.reportId)} </span>
    ));
    c.outputReports.forEach(r => reportLinks.push(
      <span key={`o-${r.reportId}`} className="link-ref" onClick={() => scrollToElement(`report-output-${r.reportId}`)}>Output 0x{hex8(r.reportId)} </span>
    ));
    c.featureReports.forEach(r => reportLinks.push(
      <span key={`f-${r.reportId}`} className="link-ref" onClick={() => scrollToElement(`report-feature-${r.reportId}`)}>Feature 0x{hex8(r.reportId)} </span>
    ));

    const reports: React.ReactNode[] = [];
    c.inputReports.forEach(r => {
      const rid = `report-input-${r.reportId}`;
      outline.push({ id: rid, label: `  Input Report 0x${hex8(r.reportId)}` });
      reports.push(<ReportBlock key={rid} report={r} type="input" collIndex={ci} />);
    });
    c.outputReports.forEach(r => {
      const rid = `report-output-${r.reportId}`;
      outline.push({ id: rid, label: `  Output Report 0x${hex8(r.reportId)}` });
      reports.push(<ReportBlock key={rid} report={r} type="output" collIndex={ci} />);
    });
    c.featureReports.forEach(r => {
      const rid = `report-feature-${r.reportId}`;
      outline.push({ id: rid, label: `  Feature Report 0x${hex8(r.reportId)}` });
      reports.push(<ReportBlock key={rid} report={r} type="feature" collIndex={ci} />);
    });

    return (
      <div className="desc-collection" id={collId} key={collId}>
        <div className="desc-collection-header">▸ Collection {ci}: {collUsage}</div>
        <div className="desc-node">
          {reportLinks.length > 0 && <div className="desc-item" style={{ marginBottom: 4 }}>Reports: {reportLinks}</div>}
          {reports}
        </div>
      </div>
    );
  });

  return { outline, content: collections };
}

function ReportBlock({ report, type, collIndex }: { report: HIDReportInfo; type: string; collIndex: number }) {
  const id = `report-${type}-${report.reportId}`;
  let bitOffset = 0;

  return (
    <>
      <div className={`desc-report-header ${type}`} id={id}>
        {type.charAt(0).toUpperCase() + type.slice(1)} Report 0x{hex8(report.reportId)}
        {' '}<span className="link-back" onClick={() => scrollToElement(`coll-${collIndex}`)}>[↑ Collection {collIndex}]</span>
      </div>
      <div className="desc-node">
        {report.items.map((item, i) => {
          const node = <ItemBlock key={i} item={item} startBit={bitOffset} />;
          bitOffset += item.reportSize * item.reportCount;
          return node;
        })}
      </div>
    </>
  );
}

function ItemBlock({ item, startBit }: { item: HIDReportItem; startBit: number }) {
  const bitWidth = item.reportCount * item.reportSize;
  const endBit = startBit + bitWidth - 1;

  let sizeStr: string;
  if (bitWidth === 1) sizeStr = `1 bit (bit ${startBit})`;
  else if (item.reportCount === 1) sizeStr = `${item.reportSize} bits (${startBit}–${endBit})`;
  else sizeStr = `${item.reportCount}×${item.reportSize} bits (${startBit}–${endBit})`;

  const flags = buildFlags(item);
  const usageStr = buildUsageString(item);
  const bounds = `Logical: ${item.logicalMinimum}…${item.logicalMaximum}`;

  return (
    <div className="desc-item">
      <span className="desc-item-bits">{sizeStr}</span>
      <span className="desc-item-flags">
        {flags.map((f, i) => <span key={i} className="desc-flag">{f}</span>)}
      </span>
      {usageStr && <><br /><span className="desc-item-usage">{usageStr}</span></>}
      <br /><span className="desc-item-bounds">{bounds}</span>
      {hasPhysicalBounds(item) && <>{' '}<span className="desc-item-bounds">Physical: {item.physicalMinimum}…{item.physicalMaximum}</span></>}
      {hasUnitDef(item) && <>{' '}<span className="desc-item-bounds">Unit: {unitsStr(item)}</span></>}
    </div>
  );
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

function hasUnitDef(item: HIDReportItem): boolean {
  return item.unitFactorLengthExponent !== 0 || item.unitFactorMassExponent !== 0 ||
    item.unitFactorTimeExponent !== 0 || item.unitFactorTemperatureExponent !== 0 ||
    item.unitFactorCurrentExponent !== 0 || item.unitFactorLuminousIntensityExponent !== 0 ||
    item.unitExponent !== 0 || item.unitSystem !== 'none';
}

function unitsStr(item: HIDReportItem): string {
  let l: string, m: string, t: string, temp: string, c: string, li: string;
  if (item.unitSystem === 'si-linear') { l='cm'; m='g'; t='s'; temp='K'; c='A'; li='cd'; }
  else if (item.unitSystem === 'si-rotation') { l='rad'; m='g'; t='s'; temp='K'; c='A'; li='cd'; }
  else if (item.unitSystem === 'english-linear') { l='in'; m='slug'; t='s'; temp='°F'; c='A'; li='cd'; }
  else if (item.unitSystem === 'english-rotation') { l='deg'; m='slug'; t='s'; temp='°F'; c='A'; li='cd'; }
  else { l='length'; m='mass'; t='time'; temp='temperature'; c='current'; li='luminous-intensity'; }

  const num: string[] = [], den: string[] = [];
  const add = (n: string, exp: number) => {
    if (exp === 0) return;
    const s = Math.abs(exp) === 1 ? n : `${n}^${Math.abs(exp)}`;
    (exp > 0 ? num : den).push(s);
  };
  add(l, item.unitFactorLengthExponent);
  add(m, item.unitFactorMassExponent);
  add(t, item.unitFactorTimeExponent);
  add(temp, item.unitFactorTemperatureExponent);
  add(c, item.unitFactorCurrentExponent);
  add(li, item.unitFactorLuminousIntensityExponent);

  const exp = item.unitExponent === 0 ? '' : `10^${item.unitExponent}·`;
  const n = num.length > 0 ? num.join('·') : '1';
  if (den.length === 0) return `${exp}${n}`;
  return `${exp}${n}/${den.join('·')}`;
}
