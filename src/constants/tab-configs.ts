// Tab configuration for pin list views
import { TabConfiguration, Pin } from '../types';

export const TAB_CONFIGS: TabConfiguration[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: '📋',
    description: 'All pins with key information',
    showSearch: true,
    showFilters: true,
    columns: [
      { key: 'pinNumber', title: 'Pin#', width: 60, sortable: true },
      { key: 'pinName', title: 'Pin Name', width: 120, sortable: true },
      { key: 'signalName', title: 'Signal', width: 120, editable: true, sortable: true },
      { key: 'bank', title: 'Bank', width: 50, sortable: true },
      { key: 'pinType', title: 'Type', width: 80, sortable: true },
      { key: 'comment', title: 'Comment', width: 200, editable: true }
    ]
  },
  {
    id: 'signals',
    title: 'Signals',
    icon: '⚡',
    description: 'Assigned signal information',
    showSearch: true,
    showFilters: true,
    columns: [
      { key: 'signalName', title: 'Signal Name', width: 140, editable: true, sortable: true },
      { key: 'pinNumber', title: 'Pin#', width: 60, sortable: true },
      { key: 'direction', title: 'Direction', width: 80, sortable: true },
      { key: 'voltage', title: 'Voltage', width: 70, sortable: true },
      { key: 'bank', title: 'Bank', width: 50, sortable: true },
      { key: 'comment', title: 'Comment', width: 180, editable: true }
    ],
    filter: (pin: Pin) => Boolean(pin.signalName && pin.signalName.trim() !== ''),
    sort: (a: Pin, b: Pin) => (a.signalName || '').localeCompare(b.signalName || '')
  },
  {
    id: 'banks',
    title: 'Banks',
    icon: '🏦',
    description: 'Pin organization by I/O banks',
    showSearch: true,
    showFilters: true,
    columns: [
      { key: 'bank', title: 'Bank', width: 50, sortable: true },
      { key: 'pinNumber', title: 'Pin#', width: 60, sortable: true },
      { key: 'voltage', title: 'Voltage', width: 70, sortable: true },
      { key: 'ioType', title: 'I/O Type', width: 80, sortable: true },
      { key: 'signalName', title: 'Signal', width: 120, editable: true },
      { key: 'comment', title: 'Comment', width: 160, editable: true }
    ],
    filter: (pin: Pin) => Boolean(pin.bank && pin.bank.trim() !== ''),
    sort: (a: Pin, b: Pin) => {
      const bankA = parseInt(a.bank || '999');
      const bankB = parseInt(b.bank || '999');
      return bankA - bankB;
    }
  },
  {
    id: 'differential',
    title: 'Diff Pairs',
    icon: '⟷',
    description: 'Differential pair management',
    showSearch: true,
    showFilters: false,
    columns: [
      { key: 'pinNumber', title: 'Pin#', width: 60, sortable: true },
      { 
        key: 'differentialPair', 
        title: 'Pair Name', 
        width: 100, 
        sortable: true,
        customRender: (_value: any, pin: Pin) => {
          if (pin.differentialPair) {
            return `${pin.differentialPair.pair} (${pin.differentialPair.type})`;
          }
          return '-';
        }
      },
      { key: 'signalName', title: 'Signal', width: 120, editable: true },
      { key: 'bank', title: 'Bank', width: 50, sortable: true },
      { key: 'voltage', title: 'Voltage', width: 70, sortable: true },
      { key: 'comment', title: 'Comment', width: 160, editable: true }
    ],
    filter: (pin: Pin) => pin.differentialPair !== undefined,
    sort: (a: Pin, b: Pin) => {
      const pairA = a.differentialPair?.pair || '';
      const pairB = b.differentialPair?.pair || '';
      return pairA.localeCompare(pairB);
    }
  },
  {
    id: 'comments',
    title: 'Comments',
    icon: '💬',
    description: 'All pins with user comments',
    showSearch: true,
    showFilters: false,
    columns: [
      { key: 'pinNumber', title: 'Pin#', width: 60, sortable: true },
      { key: 'signalName', title: 'Signal', width: 100, sortable: true },
      { key: 'comment', title: 'Comment', width: 300, editable: true },
      { 
        key: 'commentTimestamp', 
        title: 'Modified', 
        width: 120, 
        render: 'datetime',
        sortable: true 
      },
      { key: 'commentAuthor', title: 'Author', width: 80, sortable: true }
    ],
    filter: (pin: Pin) => Boolean(pin.comment && pin.comment.trim() !== ''),
    sort: (a: Pin, b: Pin) => {
      const timeA = a.commentTimestamp?.getTime() || 0;
      const timeB = b.commentTimestamp?.getTime() || 0;
      return timeB - timeA; // Most recent first
    }
  },
  {
    id: 'power',
    title: 'Power',
    icon: '⚡',
    description: 'Power and ground pins',
    showSearch: true,
    showFilters: false,
    columns: [
      { key: 'pinNumber', title: 'Pin#', width: 60, sortable: true },
      { key: 'pinName', title: 'Pin Name', width: 120, sortable: true },
      { key: 'pinType', title: 'Type', width: 80, sortable: true },
      { key: 'voltage', title: 'Voltage', width: 70, sortable: true },
      { key: 'bank', title: 'Bank', width: 50, sortable: true },
      { key: 'comment', title: 'Comment', width: 180, editable: true }
    ],
    filter: (pin: Pin) => 
      pin.pinType === 'POWER' || 
      pin.pinType === 'GROUND' || 
      pin.direction === 'Power' || 
      pin.direction === 'Ground',
    sort: (a: Pin, b: Pin) => a.pinNumber.localeCompare(b.pinNumber)
  }
];

export const DEFAULT_TAB_ID = 'overview';

// Comment templates for quick insertion
export const COMMENT_TEMPLATES = [
  {
    id: 'power-supply',
    name: 'Power Supply',
    template: 'Power: {voltage}V {current}mA',
    category: 'power' as const,
    variables: ['voltage', 'current']
  },
  {
    id: 'clock-domain',
    name: 'Clock Domain',
    template: 'Clock: {frequency}MHz, Domain: {domain}',
    category: 'clock' as const,
    variables: ['frequency', 'domain']
  },
  {
    id: 'differential-pair',
    name: 'Differential Pair',
    template: 'Diff pair: {pairName}, Partner: {partnerPin}',
    category: 'differential' as const,
    variables: ['pairName', 'partnerPin']
  },
  {
    id: 'io-standard',
    name: 'I/O Standard',
    template: 'I/O: {standard}, Drive: {drive}mA, Termination: {termination}',
    category: 'io' as const,
    variables: ['standard', 'drive', 'termination']
  },
  {
    id: 'led-output',
    name: 'LED Output',
    template: 'LED output - {color} LED, {brightness} brightness',
    category: 'io' as const,
    variables: ['color', 'brightness']
  },
  {
    id: 'test-point',
    name: 'Test Point',
    template: 'Test point for {signal} - {purpose}',
    category: 'custom' as const,
    variables: ['signal', 'purpose']
  }
];
