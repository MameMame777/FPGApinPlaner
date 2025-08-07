// Common type definitions for FPGA Pin Planner extension

export interface Pin {
    id: string;
    name: string;
    number?: string;
    location: string;
    voltage?: string;
    ioStandard?: string;
    direction?: 'input' | 'output' | 'inout' | 'bidirectional';
    diffPair?: string;
    comment?: string;
    package?: string;
    bank?: string;
}

export interface ValidationIssue {
    severity: 'error' | 'warning' | 'info';
    message: string;
    pin?: string;
    location?: string;
}
