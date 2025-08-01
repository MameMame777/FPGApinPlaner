import * as vscode from 'vscode';
import { Pin } from '../views/PinListProvider';

export class CSVImporter {
    async importFromFile(uri: vscode.Uri): Promise<Pin[]> {
        try {
            const data = await vscode.workspace.fs.readFile(uri);
            const content = Buffer.from(data).toString('utf8');
            return this.parseCSV(content);
        } catch (error) {
            throw new Error(`Failed to read file: ${error}`);
        }
    }

    private parseCSV(content: string): Pin[] {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
            return [];
        }

        // Skip header if present
        const headerLine = lines[0].toLowerCase();
        const hasHeader = headerLine.includes('pin') || headerLine.includes('name') || headerLine.includes('signal');
        const dataLines = hasHeader ? lines.slice(1) : lines;

        const pins: Pin[] = [];
        
        for (const line of dataLines) {
            const columns = this.parseCSVLine(line);
            if (columns.length >= 2) {
                const pin: Pin = {
                    number: columns[0]?.trim() || '',
                    name: columns[1]?.trim() || '',
                    direction: this.parseDirection(columns[2]) || 'bidirectional',
                    voltage: columns[3]?.trim() || undefined,
                    ioStandard: columns[4]?.trim() || undefined,
                    package: columns[5]?.trim() || undefined,
                    bank: columns[6]?.trim() || undefined,
                    comment: columns[7]?.trim() || undefined
                };
                
                if (pin.number && pin.name) {
                    pins.push(pin);
                }
            }
        }

        return pins;
    }

    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    private parseDirection(directionStr?: string): Pin['direction'] | undefined {
        if (!directionStr) return undefined;
        
        const dir = directionStr.toLowerCase().trim();
        if (dir.includes('in') && !dir.includes('out')) return 'input';
        if (dir.includes('out') && !dir.includes('in')) return 'output';
        if (dir.includes('bi') || dir.includes('inout')) return 'bidirectional';
        
        return undefined;
    }
}
