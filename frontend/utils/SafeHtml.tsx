import React from 'react';
import { sanitizeHtml } from './htmlSanitizer';

interface SafeHtmlProps {
  html: string;
  className?: string;
  allowScripts?: boolean;
}

export const SafeHtml: React.FC<SafeHtmlProps> = ({ 
  html, 
  className, 
  allowScripts = false 
}) => {
  const sanitizedHtml = sanitizeHtml(html, { allowScripts });
  
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default SafeHtml;
