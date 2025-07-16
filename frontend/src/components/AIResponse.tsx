import React from 'react';
import { Bot, CheckCircle, AlertCircle, Info, Lightbulb, Quote, Code, Hash, List, Clock } from 'lucide-react';

interface AIResponseProps {
  content: string;
  timestamp: Date;
}

const AIResponse: React.FC<AIResponseProps> = ({ content, timestamp }) => {
  // Parse the content to identify different sections
  const parseContent = (text: string) => {
    const sections = [];
    const lines = text.split('\n');
    let currentSection = { type: 'text', content: '' };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        if (currentSection.content.trim()) {
          currentSection.content += '\n';
        }
        continue;
      }
      
      // Check for headers (lines ending with ':' or start with '#')
      if ((line.endsWith(':') && line.length > 3 && !line.includes('http')) || line.startsWith('#')) {
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }
        currentSection = { 
          type: 'header', 
          content: line.replace(/^#+\s*/, '').replace(':', '') 
        };
        continue;
      }
      
      // Check for bullet points
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        if (currentSection.type !== 'list') {
          if (currentSection.content.trim()) {
            sections.push(currentSection);
          }
          currentSection = { type: 'list', content: line.replace(/^[•\-*]\s*/, '') };
        } else {
          currentSection.content += '\n' + line.replace(/^[•\-*]\s*/, '');
        }
        continue;
      }
      
      // Check for numbered lists
      if (line.match(/^\d+\.\s/)) {
        const match = line.match(/^(\d+)\.\s(.+)$/);
        if (match) {
          if (currentSection.type !== 'numbered-list') {
            if (currentSection.content.trim()) {
              sections.push(currentSection);
            }
            currentSection = { type: 'numbered-list', content: match[2] };
          } else {
            currentSection.content += '\n' + match[2];
          }
        }
        continue;
      }
      
      // Check for code blocks
      if (line.startsWith('```')) {
        if (currentSection.type !== 'code') {
          if (currentSection.content.trim()) {
            sections.push(currentSection);
          }
          currentSection = { type: 'code', content: '' };
        } else {
          sections.push(currentSection);
          currentSection = { type: 'text', content: '' };
        }
        continue;
      }
      
      // Check for quotes
      if (line.startsWith('>') || line.startsWith('"')) {
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }
        currentSection = { type: 'quote', content: line.replace(/^[>"]\s*/, '') };
        continue;
      }
      
      // Check for key insights or important notes
      if (line.toLowerCase().includes('key point') || 
          line.toLowerCase().includes('important') || 
          line.toLowerCase().includes('note:') ||
          line.toLowerCase().includes('summary:') ||
          line.toLowerCase().includes('conclusion:')) {
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }
        currentSection = { type: 'highlight', content: line };
        continue;
      }
      
      // Regular text
      if (currentSection.type === 'text') {
        currentSection.content += (currentSection.content ? '\n' : '') + line;
      } else {
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }
        currentSection = { type: 'text', content: line };
      }
    }
    
    // Add the last section
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }
    
    return sections;
  };

  const renderSection = (section: any, index: number) => {
    switch (section.type) {
      case 'header':
        return (
          <div key={index} className="flex items-center space-x-2 mb-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-1 rounded-lg">
              <Hash className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {section.content}
            </h3>
          </div>
        );
      
      case 'list':
        const listItems = section.content.split('\n').filter((item: string) => item.trim());
        return (
          <div key={index} className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <List className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Key Points</span>
            </div>
            <ul className="space-y-2 ml-6">
              {listItems.map((item: string, itemIndex: number) => (
                <li key={itemIndex} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      
      case 'numbered-list':
        const numberedItems = section.content.split('\n').filter((item: string) => item.trim());
        return (
          <div key={index} className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <List className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Steps</span>
            </div>
            <ol className="space-y-2 ml-6">
              {numberedItems.map((item: string, itemIndex: number) => (
                <li key={itemIndex} className="flex items-start space-x-3">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center mt-0.5 flex-shrink-0">
                    {itemIndex + 1}
                  </div>
                  <span className="text-gray-700 leading-relaxed">{item}</span>
                </li>
              ))}
            </ol>
          </div>
        );
      
      case 'code':
        return (
          <div key={index} className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Code className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Code</span>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                {section.content}
              </pre>
            </div>
          </div>
        );
      
      case 'quote':
        return (
          <div key={index} className="mb-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-r-lg p-4">
              <div className="flex items-start space-x-3">
                <Quote className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700 italic leading-relaxed">
                  "{section.content}"
                </p>
              </div>
            </div>
          </div>
        );
      
      case 'highlight':
        return (
          <div key={index} className="mb-4">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-1 rounded-lg">
                  <Lightbulb className="h-4 w-4 text-white" />
                </div>
                <p className="text-gray-800 font-medium leading-relaxed">
                  {section.content}
                </p>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div key={index} className="mb-4">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {section.content}
            </p>
          </div>
        );
    }
  };

  const sections = parseContent(content);

  return (
    <div className="space-y-1">
      {/* AI Assistant Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="text-sm font-medium text-gray-600">AI Assistant</div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{timestamp.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-4">
        {sections.map((section, index) => renderSection(section, index))}
      </div>
    </div>
  );
};

export default AIResponse;
