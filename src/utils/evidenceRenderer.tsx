import React from 'react';

type EntityClick = (type: string, id: string) => void;

const parseTextWithTags = (
  text: string,
  keyPrefix: string,
  onEntityClick?: EntityClick
) => {
  const parts = text.split(/(\[\[(?:GENE|PATHWAY|COMPOUND):.+?\]\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[\[(GENE|PATHWAY|COMPOUND):(.+?)\]\]$/);
    if (match) {
      const [, type, id] = match;
      return (
        <span
          key={`${keyPrefix}-${i}`}
          className={`ai-entity-link ${type.toLowerCase()}`}
          onClick={() => onEntityClick && onEntityClick(type, id)}
          title={`Click to highlight ${type}: ${id}`}
        >
          {id}
        </span>
      );
    }

    const boldParts = part.split(/(\*\*.+?\*\*)/g);
    return boldParts.map((bp, j) => {
      const bMatch = bp.match(/^\*\*(.+?)\*\*$/);
      if (bMatch) {
        return <strong key={`${keyPrefix}-${i}-${j}`}>{bMatch[1]}</strong>;
      }
      return <span key={`${keyPrefix}-${i}-${j}`}>{bp}</span>;
    });
  });
};

export const renderEvidenceContent = (
  content: string,
  onEntityClick?: EntityClick
) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = (lineIdx: number) => {
    if (currentList.length > 0 && listType) {
      const ListTag = listType === 'ol' ? 'ol' : 'ul';
      elements.push(
        <ListTag key={`list-${lineIdx}-${elements.length}`} className="ai-list">
          {currentList.map((item, i) => (
            <li key={i}>{parseTextWithTags(item, `li-${lineIdx}-${i}`, onEntityClick)}</li>
          ))}
        </ListTag>
      );
      currentList = [];
      listType = null;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)/);
    const numMatch = trimmed.match(/^\d+[.)]\s+(.+)/);

    if (bulletMatch) {
      if (listType !== 'ul') flushList(idx);
      listType = 'ul';
      currentList.push(bulletMatch[1]);
      return;
    }
    if (numMatch) {
      if (listType !== 'ol') flushList(idx);
      listType = 'ol';
      currentList.push(numMatch[1]);
      return;
    }

    flushList(idx);

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${idx}`}>{parseTextWithTags(trimmed.replace('### ', ''), `h3-${idx}`, onEntityClick)}</h3>
      );
      return;
    }
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      elements.push(
        <h4 key={`h4-${idx}`}>{parseTextWithTags(trimmed.replace(/\*\*/g, ''), `h4-${idx}`, onEntityClick)}</h4>
      );
      return;
    }
    if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
      elements.push(
        <em key={`em-${idx}`}>{parseTextWithTags(trimmed.replace(/\*/g, ''), `em-${idx}`, onEntityClick)}</em>
      );
      return;
    }
    if (trimmed === '') {
      elements.push(<br key={`br-${idx}`} />);
      return;
    }

    elements.push(
      <div key={`p-${idx}`} className="ai-paragraph">
        {parseTextWithTags(line, `p-${idx}`, onEntityClick)}
      </div>
    );
  });

  flushList(lines.length + 1);
  return elements;
};
