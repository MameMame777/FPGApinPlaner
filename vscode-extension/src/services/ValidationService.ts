import { Pin, ValidationIssue } from '../types';

export class ValidationService {
    validateAll(pins: Pin[]): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        
        // Check for duplicate pin numbers
        const pinNumbers = new Map<string, Pin[]>();
        for (const pin of pins) {
            if (pin.number) {
                if (!pinNumbers.has(pin.number)) {
                    pinNumbers.set(pin.number, []);
                }
                pinNumbers.get(pin.number)!.push(pin);
            }
        }

        for (const [number, pinsWithNumber] of pinNumbers) {
            if (pinsWithNumber.length > 1) {
                issues.push({
                    message: `Duplicate pin number: ${number}`,
                    severity: 'error',
                    pin: number
                });
            }
        }

        // Check for duplicate pin names
        const pinNames = new Map<string, Pin[]>();
        for (const pin of pins) {
            if (!pinNames.has(pin.name)) {
                pinNames.set(pin.name, []);
            }
            pinNames.get(pin.name)!.push(pin);
        }

        for (const [name, pinsWithName] of pinNames) {
            if (pinsWithName.length > 1) {
                issues.push({
                    message: `Duplicate signal name: ${name}`,
                    severity: 'error',
                    pin: name
                });
            }
        }

        // Check for missing essential properties
        for (const pin of pins) {
            if (!pin.number) {
                issues.push({
                    message: `Missing pin number for signal: ${pin.name}`,
                    severity: 'error',
                    pin: pin.name
                });
            }

            if (!pin.name) {
                issues.push({
                    message: `Missing signal name for pin: ${pin.number}`,
                    severity: 'error',
                    pin: pin.number
                });
            }

            if (!pin.direction) {
                issues.push({
                    message: `Missing direction for pin: ${pin.number} (${pin.name})`,
                    severity: 'warning',
                    pin: pin.number
                });
            }

            if (!pin.voltage) {
                issues.push({
                    message: `Missing voltage specification for pin: ${pin.number} (${pin.name})`,
                    severity: 'warning',
                    pin: pin.number
                });
            }

            if (!pin.ioStandard) {
                issues.push({
                    message: `Missing I/O standard for pin: ${pin.number} (${pin.name})`,
                    severity: 'info',
                    pin: pin.number
                });
            }
        }

        return issues;
    }

    validatePin(pin: Pin): ValidationIssue[] {
        const issues: ValidationIssue[] = [];

        if (!pin.number) {
            issues.push({
                message: 'Pin number is required',
                severity: 'error',
                pin: pin.name
            });
        }

        if (!pin.name) {
            issues.push({
                message: 'Signal name is required',
                severity: 'error',
                pin: pin.number
            });
        }

        // Add more specific validations as needed
        return issues;
    }
}
