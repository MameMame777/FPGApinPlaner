// Sample FPGA pin data for testing
import { Pin, Package } from '@/types';

export const createSamplePackage = (): Package => {
  const samplePins: Pin[] = [
    {
      id: '1',
      pinNumber: 'A1',
      pinName: 'IO_L1P_T0_D00_MOSI_14',
      signalName: '',
      direction: 'InOut',
      pinType: 'IO',
      voltage: '3.3V',
      packagePin: 'A1',
      position: { x: 20, y: 20 },
      gridPosition: { row: 'A', col: 1 },
      isAssigned: false,
      bank: '14',
      memoryByteGroup: '0',
      ioType: 'HR',
    },
    {
      id: '2',
      pinNumber: 'A2',
      pinName: 'IO_L1N_T0_D01_DIN_14',
      signalName: '',
      direction: 'InOut',
      pinType: 'IO',
      voltage: '3.3V',
      packagePin: 'A2',
      position: { x: 40, y: 20 },
      gridPosition: { row: 'A', col: 2 },
      isAssigned: false,
      bank: '14',
      memoryByteGroup: '0',
      ioType: 'HR',
    },
    {
      id: '3',
      pinNumber: 'B1',
      pinName: 'VCCINT',
      signalName: '',
      direction: 'Power',
      pinType: 'POWER',
      voltage: '1.0V',
      packagePin: 'B1',
      position: { x: 20, y: 40 },
      gridPosition: { row: 'B', col: 1 },
      isAssigned: false,
    },
    {
      id: '4',
      pinNumber: 'B2',
      pinName: 'GND',
      signalName: '',
      direction: 'Ground',
      pinType: 'GROUND',
      voltage: '0V',
      packagePin: 'B2',
      position: { x: 40, y: 40 },
      gridPosition: { row: 'B', col: 2 },
      isAssigned: false,
    },
    {
      id: '5',
      pinNumber: 'C1',
      pinName: 'IO_L2P_T0_D02_14',
      signalName: 'CLK_IN',
      direction: 'Input',
      pinType: 'CLOCK',
      voltage: '3.3V',
      packagePin: 'C1',
      position: { x: 20, y: 60 },
      gridPosition: { row: 'C', col: 1 },
      isAssigned: true,
      bank: '14',
      memoryByteGroup: '0',
      ioType: 'HR',
    },
    {
      id: '6',
      pinNumber: 'C2',
      pinName: 'IO_L2N_T0_D03_14',
      signalName: 'RST_N',
      direction: 'Input',
      pinType: 'IO',
      voltage: '3.3V',
      packagePin: 'C2',
      position: { x: 40, y: 60 },
      gridPosition: { row: 'C', col: 2 },
      isAssigned: true,
      bank: '14',
      memoryByteGroup: '0',
      ioType: 'HR',
    },
    {
      id: '7',
      pinNumber: 'D1',
      pinName: 'CONFIG_DONE',
      signalName: '',
      direction: 'Output',
      pinType: 'CONFIG',
      voltage: '3.3V',
      packagePin: 'D1',
      position: { x: 20, y: 80 },
      gridPosition: { row: 'D', col: 1 },
      isAssigned: false,
      ioType: 'CONFIG',
    },
    {
      id: '8',
      pinNumber: 'D2',
      pinName: 'MGTPRXP1_216',
      signalName: '',
      direction: 'InOut',
      pinType: 'MGT',
      voltage: '1.2V',
      packagePin: 'D2',
      position: { x: 40, y: 80 },
      gridPosition: { row: 'D', col: 2 },
      isAssigned: false,
      bank: '216',
      ioType: 'GTP',
    },
  ];

  return {
    id: 'sample-package',
    name: 'Sample FPGA Package',
    device: 'XC7A12T',
    packageType: 'CPG238',
    dimensions: {
      rows: 4,
      cols: 2,
    },
    pins: samplePins,
    totalPins: samplePins.length,
  };
};

export const SAMPLE_CSV_CONTENT = `# Xilinx XC7A12T Package Data
# Copyright (C) 2024 Sample Data
Pin,Pin Name,Memory Byte Group,Bank,VCCAUX Group,Super Logic Region,I/O Type,No-Connect
A1,IO_L1P_T0_D00_MOSI_14,0,14,NA,X0Y0,HR,FALSE
A2,IO_L1N_T0_D01_DIN_14,0,14,NA,X0Y0,HR,FALSE
B1,VCCINT,NA,NA,NA,NA,POWER,FALSE
B2,GND,NA,NA,NA,NA,GROUND,FALSE
C1,IO_L2P_T0_D02_14,0,14,NA,X0Y0,HR,FALSE
C2,IO_L2N_T0_D03_14,0,14,NA,X0Y0,HR,FALSE
D1,CONFIG_DONE,NA,NA,NA,NA,CONFIG,FALSE
D2,MGTPRXP1_216,NA,216,NA,NA,GTP,FALSE`;

export const loadSampleData = () => {
  // Create a blob URL for sample CSV data
  const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv' });
  return new File([blob], 'sample-fpga-pins.csv', { type: 'text/csv' });
};
