interface HIDReportItem {
  isAbsolute: boolean;
  isArray: boolean;
  isBufferedBytes: boolean;
  isConstant: boolean;
  isLinear: boolean;
  isRange: boolean;
  isVolatile: boolean;
  hasNull: boolean;
  hasPreferredState: boolean;
  wrap: boolean;
  logicalMaximum: number;
  logicalMinimum: number;
  physicalMaximum: number;
  physicalMinimum: number;
  reportCount: number;
  reportSize: number;
  unitExponent: number;
  unitFactorCurrentExponent: number;
  unitFactorLengthExponent: number;
  unitFactorLuminousIntensityExponent: number;
  unitFactorMassExponent: number;
  unitFactorTemperatureExponent: number;
  unitFactorTimeExponent: number;
  unitSystem: string;
  usageMaximum: number;
  usageMinimum: number;
  usages: number[];
}

interface HIDReportInfo {
  reportId: number;
  items: HIDReportItem[];
}

interface HIDCollectionInfo {
  featureReports: HIDReportInfo[];
  inputReports: HIDReportInfo[];
  outputReports: HIDReportInfo[];
  children: HIDCollectionInfo[];
  type: number;
  usage: number;
  usagePage: number;
}

interface HIDInputReportEvent extends Event {
  device: HIDDevice;
  reportId: number;
  data: DataView;
}

interface HIDConnectionEvent extends Event {
  device: HIDDevice;
}

interface HIDDevice extends EventTarget {
  opened: boolean;
  vendorId: number;
  productId: number;
  productName: string;
  collections: HIDCollectionInfo[];
  oninputreport: ((event: HIDInputReportEvent) => void) | null;
  open(): Promise<void>;
  close(): Promise<void>;
  sendReport(reportId: number, data: BufferSource): Promise<void>;
  sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
  receiveFeatureReport(reportId: number): Promise<DataView>;
}

interface HIDDeviceRequestOptions {
  filters: Array<{ vendorId?: number; productId?: number; usagePage?: number; usage?: number }>;
}

interface HID extends EventTarget {
  getDevices(): Promise<HIDDevice[]>;
  requestDevice(options: HIDDeviceRequestOptions): Promise<HIDDevice[]>;
  addEventListener(type: 'connect', listener: (event: HIDConnectionEvent) => void): void;
  addEventListener(type: 'disconnect', listener: (event: HIDConnectionEvent) => void): void;
}

interface Navigator {
  hid: HID;
}
