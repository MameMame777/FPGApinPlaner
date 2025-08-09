import React, { useState } from 'react';
import { CommentManager } from '../../services/comment-service';
import { CommentTemplate, Pin } from '../../types';

interface CommentTemplateSelectorProps {
  onSelect: (_templateId: string, _variables: Record<string, string>) => void;
  pin?: Pin;
  className?: string;
}

export const CommentTemplateSelector: React.FC<CommentTemplateSelectorProps> = ({
  onSelect,
  pin,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CommentTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});

  const templates = CommentManager.getTemplates();

  const handleTemplateSelect = (template: CommentTemplate) => {
    setSelectedTemplate(template);
    
    // Pre-fill variables if pin data is available
    const prefilled: Record<string, string> = {};
    if (pin) {
      if (template.variables?.includes('voltage')) {
        prefilled.voltage = pin.voltage || '';
      }
      if (template.variables?.includes('pairName') && pin.differentialPair) {
        prefilled.pairName = pin.differentialPair.pair;
      }
      if (template.variables?.includes('partnerPin') && pin.differentialPair) {
        prefilled.partnerPin = pin.differentialPair.pair;
      }
      if (template.variables?.includes('signal')) {
        prefilled.signal = pin.signalName || '';
      }
    }
    
    setVariables(prefilled);
  };

  const handleApply = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate.id, variables);
      setIsOpen(false);
      setSelectedTemplate(null);
      setVariables({});
    }
  };

  const handleGenerate = () => {
    if (pin) {
      const autoComment = CommentManager.generateAutoComment(pin);
      onSelect('auto', { autoComment });
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`comment-template-trigger ${className}`}
        title="Insert comment template"
        style={{
          padding: '4px 8px',
          border: '1px solid #555',
          borderRadius: '3px',
          backgroundColor: '#333',
          cursor: 'pointer',
          fontSize: '12px',
          color: '#cccccc'
        }}
      >
        📝 Template
      </button>
    );
  }

  return (
    <div 
      className="comment-template-selector"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#2a2a2a',
        border: '1px solid #555',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        padding: '16px',
        minWidth: '400px',
        maxWidth: '500px',
        zIndex: 1000,
        color: '#ffffff'
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>
          Comment Templates
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#cccccc'
          }}
        >
          ✕
        </button>
      </div>

      {/* Auto-generate option */}
      {pin && (
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={handleGenerate}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #28a745',
              borderRadius: '6px',
              backgroundColor: '#f8fff9',
              color: '#28a745',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🤖 Generate Auto Comment
          </button>
        </div>
      )}

      {/* Template selection */}
      {!selectedTemplate ? (
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#cccccc' }}>
            Choose a template:
          </h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#007acc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#ddd';
                }}
              >
                <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                  {template.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {template.template}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
            Fill in variables for "{selectedTemplate.name}":
          </h4>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'monospace',
              border: '1px solid #e0e0e0'
            }}>
              {selectedTemplate.template}
            </div>
          </div>

          {selectedTemplate.variables && selectedTemplate.variables.length > 0 ? (
            <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
              {selectedTemplate.variables.map(variable => (
                <div key={variable}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#333'
                  }}>
                    {variable}:
                  </label>
                  <input
                    type="text"
                    value={variables[variable] || ''}
                    onChange={(e) => setVariables(prev => ({
                      ...prev,
                      [variable]: e.target.value
                    }))}
                    placeholder={`Enter ${variable}...`}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setSelectedTemplate(null)}
              style={{
                padding: '8px 16px',
                border: '1px solid #6c757d',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: '#6c757d',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Back
            </button>
            <button
              onClick={handleApply}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#007acc',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Apply Template
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: -1
        }}
        onClick={() => setIsOpen(false)}
      />
    </div>
  );
};
