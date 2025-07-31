import { Pin, CommentTemplate } from '../types';

export class CommentManager {
  // Predefined comment templates
  private static templates: CommentTemplate[] = [
    {
      id: 'power-supply',
      name: 'Power Supply',
      template: 'Power: {voltage}V {current}mA',
      category: 'power',
      variables: ['voltage', 'current']
    },
    {
      id: 'clock-domain',
      name: 'Clock Domain',
      template: 'Clock: {frequency}MHz, Domain: {domain}',
      category: 'clock',
      variables: ['frequency', 'domain']
    },
    {
      id: 'differential-pair',
      name: 'Differential Pair',
      template: 'Diff pair: {pairName}, Partner: {partnerPin}',
      category: 'differential',
      variables: ['pairName', 'partnerPin']
    },
    {
      id: 'io-standard',
      name: 'I/O Standard',
      template: 'I/O: {standard}, Drive: {drive}mA, Termination: {termination}',
      category: 'io',
      variables: ['standard', 'drive', 'termination']
    },
    {
      id: 'led-output',
      name: 'LED Output',
      template: 'LED output - {color} LED, {brightness} brightness',
      category: 'io',
      variables: ['color', 'brightness']
    },
    {
      id: 'test-point',
      name: 'Test Point',
      template: 'Test point for {signal} - {purpose}',
      category: 'custom',
      variables: ['signal', 'purpose']
    }
  ];

  /**
   * Generate automatic comment based on pin properties
   */
  static generateAutoComment(pin: Pin): string {
    const comments: string[] = [];

    // Pin type based comments
    if (pin.pinType.includes('POWER')) {
      comments.push(`Power pin: ${pin.bank ? `Bank ${pin.bank}` : 'System'}`);
    }

    if (pin.pinType.includes('CLOCK')) {
      comments.push('Clock input');
    }

    if (pin.pinType === 'GROUND') {
      comments.push('Ground pin');
    }

    // Differential pair information
    if (pin.differentialPair) {
      const polarity = pin.differentialPair.type === 'positive' ? 'Positive' : 'Negative';
      comments.push(`Diff pair: ${pin.differentialPair.pair} (${polarity})`);
    }

    // Signal name based inference
    if (pin.signalName) {
      const signal = pin.signalName.toUpperCase();
      
      if (signal.includes('CLK')) {
        comments.push('Clock signal');
      }
      if (signal.includes('RST') || signal.includes('RESET')) {
        comments.push('Reset signal');
      }
      if (signal.includes('LED')) {
        comments.push('LED output');
      }
      if (signal.includes('BTN') || signal.includes('BUTTON')) {
        comments.push('Button input');
      }
      if (signal.includes('SW') || signal.includes('SWITCH')) {
        comments.push('Switch input');
      }
      if (signal.includes('UART') || signal.includes('TX') || signal.includes('RX')) {
        comments.push('UART communication');
      }
      if (signal.includes('SPI') || signal.includes('SCK') || signal.includes('MOSI') || signal.includes('MISO')) {
        comments.push('SPI interface');
      }
      if (signal.includes('I2C') || signal.includes('SCL') || signal.includes('SDA')) {
        comments.push('I2C interface');
      }
    }

    // Bank information
    if (pin.bank && pin.bank !== '') {
      comments.push(`Bank ${pin.bank}`);
    }

    // Voltage information
    if (pin.voltage) {
      comments.push(`${pin.voltage} I/O`);
    }

    return comments.join('; ');
  }

  /**
   * Apply template with variables
   */
  static applyTemplate(templateId: string, variables: Record<string, string>): string {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return '';

    let result = template.template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(`{${key}}`, value);
    });

    return result;
  }

  /**
   * Get available templates
   */
  static getTemplates(): CommentTemplate[] {
    return [...this.templates];
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(category: CommentTemplate['category']): CommentTemplate[] {
    return this.templates.filter(t => t.category === category);
  }

  /**
   * Search comments across pins
   */
  static searchComments(pins: Pin[], query: string): Pin[] {
    const lowercaseQuery = query.toLowerCase();
    return pins.filter(pin => 
      (pin.comment || '').toLowerCase().includes(lowercaseQuery) ||
      (pin.autoComment || '').toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Validate comment content
   */
  static validateComment(comment: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (comment.length > 500) {
      errors.push('Comment too long (max 500 characters)');
    }

    // Check for potentially problematic characters
    const problematicChars = /[<>'"&]/g;
    if (problematicChars.test(comment)) {
      errors.push('Comment contains potentially unsafe characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format comment for display
   */
  static formatComment(comment: string, maxLength: number = 50): string {
    if (!comment) return '';
    
    if (comment.length <= maxLength) {
      return comment;
    }

    return comment.substring(0, maxLength - 3) + '...';
  }

  /**
   * Export comments to various formats
   */
  static exportComments(pins: Pin[], format: 'csv' | 'json' | 'markdown'): string {
    const pinsWithComments = pins.filter(pin => pin.comment && pin.comment.trim() !== '');

    switch (format) {
      case 'csv':
        return this.exportToCSV(pinsWithComments);
      case 'json':
        return this.exportToJSON(pinsWithComments);
      case 'markdown':
        return this.exportToMarkdown(pinsWithComments);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private static exportToCSV(pins: Pin[]): string {
    const headers = ['Pin Number', 'Pin Name', 'Signal Name', 'Bank', 'Comment', 'Author', 'Modified'];
    const rows = pins.map(pin => [
      pin.pinNumber,
      pin.pinName,
      pin.signalName || '',
      pin.bank || '',
      pin.comment || '',
      pin.commentAuthor || '',
      pin.commentTimestamp ? pin.commentTimestamp.toISOString() : ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  private static exportToJSON(pins: Pin[]): string {
    const data = pins.map(pin => ({
      pinNumber: pin.pinNumber,
      pinName: pin.pinName,
      signalName: pin.signalName,
      bank: pin.bank,
      comment: pin.comment,
      commentAuthor: pin.commentAuthor,
      commentTimestamp: pin.commentTimestamp?.toISOString()
    }));

    return JSON.stringify(data, null, 2);
  }

  private static exportToMarkdown(pins: Pin[]): string {
    const header = `# Pin Comments\n\nGenerated on ${new Date().toISOString()}\n\n`;
    const tableHeader = '| Pin | Signal | Bank | Comment | Author | Modified |\n|-----|--------|------|---------|--------|----------|\n';
    
    const rows = pins.map(pin => {
      const comment = (pin.comment || '').replace(/\|/g, '\\|'); // Escape pipes for markdown
      const modified = pin.commentTimestamp ? pin.commentTimestamp.toLocaleDateString() : '';
      return `| ${pin.pinNumber} | ${pin.signalName || ''} | ${pin.bank || ''} | ${comment} | ${pin.commentAuthor || ''} | ${modified} |`;
    }).join('\n');

    return header + tableHeader + rows;
  }

  /**
   * Merge comments from external source
   */
  static mergeComments(currentPins: Pin[], importedComments: Array<{
    pinNumber: string;
    comment: string;
    author?: string;
  }>): { updated: Pin[]; conflicts: Array<{ pinNumber: string; current: string; imported: string }> } {
    const conflicts: Array<{ pinNumber: string; current: string; imported: string }> = [];
    const updated = [...currentPins];

    importedComments.forEach(importedComment => {
      const pin = updated.find(p => p.pinNumber === importedComment.pinNumber);
      if (pin) {
        if (pin.comment && pin.comment.trim() !== '' && pin.comment !== importedComment.comment) {
          conflicts.push({
            pinNumber: pin.pinNumber,
            current: pin.comment,
            imported: importedComment.comment
          });
        } else {
          pin.comment = importedComment.comment;
          pin.commentTimestamp = new Date();
          pin.commentAuthor = importedComment.author || 'imported';
        }
      }
    });

    return { updated, conflicts };
  }
}
