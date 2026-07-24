import { useState, useEffect, useCallback, useRef } from 'react';
import { hex8 } from './utils';

export interface InputReportEntry {
  id: number;
  timestamp: string;
  data: string;
  reportId: number;
}

const MAX_REPORTS = 100;
let reportCounter = 0;

export function useWebHID() {
  const [devices, setDevices] = useState<HIDDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<HIDDevice | null>(null);
  const [inputReports, setInputReports] = useState<InputReportEntry[]>([]);
  const selectedRef = useRef<HIDDevice | null>(null);

  useEffect(() => {
    selectedRef.current = selectedDevice;
  }, [selectedDevice]);

  const handleInputReport = useCallback((event: HIDInputReportEvent) => {
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    let buffer = hex8(event.reportId);
    const reportData = new Uint8Array(event.data.buffer);
    for (const byte of reportData) buffer += ' ' + hex8(byte);
    setInputReports(prev => {
      const next = [{ id: ++reportCounter, timestamp: ts, data: buffer, reportId: event.reportId }, ...prev];
      return next.length > MAX_REPORTS ? next.slice(0, MAX_REPORTS) : next;
    });
  }, []);

  const selectDevice = useCallback(async (device: HIDDevice | null) => {
    if (selectedRef.current) selectedRef.current.oninputreport = null;
    setSelectedDevice(device);
    setInputReports([]);
    if (device) {
      device.oninputreport = handleInputReport;
      if (!device.opened) {
        try { await device.open(); } catch (e) { console.error('Error opening device:', e); }
      }
    }
  }, [handleInputReport]);

  const connect = useCallback(async () => {
    const newDevices = await navigator.hid.requestDevice({ filters: [] });
    for (const d of newDevices) {
      setDevices(prev => {
        if (prev.includes(d)) return prev;
        return [...prev, d];
      });
      if (!selectedRef.current) await selectDevice(d);
    }
  }, [selectDevice]);

  const clearReports = useCallback(() => setInputReports([]), []);

  const sendOutputReport = useCallback(async (reportId: number, data: Uint8Array) => {
    if (selectedRef.current) await selectedRef.current.sendReport(reportId, data as any);
  }, []);

  const sendFeatureReport = useCallback(async (reportId: number, data: Uint8Array) => {
    if (selectedRef.current) await selectedRef.current.sendFeatureReport(reportId, data as any);
  }, []);

  const receiveFeatureReport = useCallback(async (reportId: number): Promise<string | null> => {
    if (!selectedRef.current) return null;
    const result = await selectedRef.current.receiveFeatureReport(reportId);
    let buffer = hex8(reportId);
    const resultData = new Uint8Array(result.buffer);
    for (const byte of resultData) buffer += ' ' + hex8(byte);
    return buffer;
  }, []);

  useEffect(() => {
    const onConnect = (e: HIDConnectionEvent) => {
      setDevices(prev => prev.includes(e.device) ? prev : [...prev, e.device]);
    };
    const onDisconnect = (e: HIDConnectionEvent) => {
      setDevices(prev => prev.filter(d => d !== e.device));
      if (selectedRef.current === e.device) {
        setSelectedDevice(null);
      }
    };
    navigator.hid.addEventListener('connect', onConnect);
    navigator.hid.addEventListener('disconnect', onDisconnect);
    navigator.hid.getDevices().then(async (devs) => {
      setDevices(devs);
      if (devs.length > 0) await selectDevice(devs[0]);
    });
    return () => {
      navigator.hid.removeEventListener('connect', onConnect);
      navigator.hid.removeEventListener('disconnect', onDisconnect);
    };
  }, [selectDevice]);

  return {
    devices,
    selectedDevice,
    selectDevice,
    connect,
    inputReports,
    clearReports,
    sendOutputReport,
    sendFeatureReport,
    receiveFeatureReport,
  };
}
