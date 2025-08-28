/**
 * HTML Sanitization Utility
 * 
 * This module provides comprehensive HTML sanitization to prevent XSS attacks.
 * It cleans user input before rendering to ensure safe HTML output.
 */

// Allowed HTML tags and their attributes
const ALLOWED_TAGS: Record<string, string[]> = {
  'div': ['class', 'id', 'style'],
  'span': ['class', 'id', 'style'],
  'p': ['class', 'id', 'style'],
  'h1': ['class', 'id'],
  'h2': ['class', 'id'],
  'h3': ['class', 'id'],
  'h4': ['class', 'id'],
  'h5': ['class', 'id'],
  'h6': ['class', 'id'],
  'ul': ['class', 'id'],
  'ol': ['class', 'id'],
  'li': ['class', 'id'],
  'a': ['href', 'class', 'id', 'target', 'rel'],
  'strong': ['class', 'id'],
  'em': ['class', 'id'],
  'b': ['class', 'id'],
  'i': ['class', 'id'],
  'u': ['class', 'id'],
  'br': [],
  'hr': ['class', 'id'],
  'blockquote': ['class', 'id'],
  'code': ['class', 'id'],
  'pre': ['class', 'id'],
  'table': ['class', 'id'],
  'thead': ['class', 'id'],
  'tbody': ['class', 'id'],
  'tr': ['class', 'id'],
  'th': ['class', 'id'],
  'td': ['class', 'id'],
  'img': ['src', 'alt', 'class', 'id', 'width', 'height'],
  'iframe': ['src', 'class', 'id', 'width', 'height', 'frameborder', 'allowfullscreen']
};

// Allowed CSS properties for style attributes
const ALLOWED_CSS_PROPERTIES: string[] = [
  'color',
  'background-color',
  'font-size',
  'font-weight',
  'font-family',
  'text-align',
  'text-decoration',
  'margin',
  'padding',
  'border',
  'border-radius',
  'width',
  'height',
  'display',
  'position',
  'top',
  'left',
  'right',
  'bottom',
  'z-index',
  'opacity',
  'visibility',
  'overflow',
  'white-space',
  'word-wrap',
  'word-break',
  'line-height',
  'letter-spacing',
  'text-transform',
  'text-shadow',
  'box-shadow',
  'transform',
  'transition',
  'animation',
  'cursor',
  'pointer-events',
  'user-select',
  'touch-action',
  'webkit-tap-highlight-color',
  'webkit-touch-callout',
  'webkit-user-select'
];

// Dangerous patterns to remove
const DANGEROUS_PATTERNS: RegExp[] = [
  /javascript:/gi,
  /vbscript:/gi,
  /data:/gi,
  /on\w+\s*=/gi,
  /<script/gi,
  /<\/script>/gi,
  /<iframe/gi,
  /<\/iframe>/gi,
  /<object/gi,
  /<\/object>/gi,
  /<embed/gi,
  /<\/embed>/gi,
  /<applet/gi,
  /<\/applet>/gi,
  /<form/gi,
  /<\/form>/gi,
  /<input/gi,
  /<textarea/gi,
  /<select/gi,
  /<button/gi,
  /<link/gi,
  /<meta/gi,
  /<style/gi,
  /<\/style>/gi
];

// URL schemes that are allowed
const ALLOWED_URL_SCHEMES: string[] = [
  'http',
  'https',
  'mailto',
  'tel',
  'ftp',
  'sftp'
];

/**
 * Sanitize a string containing HTML
 * @param html - The HTML string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(
  html: string,
  options: {
    allowedTags?: Record<string, string[]>;
    allowedAttributes?: Record<string, string[]>;
    allowedCssProperties?: string[];
    stripComments?: boolean;
    stripWhitespace?: boolean;
    allowImages?: boolean;
    allowLinks?: boolean;
    allowScripts?: boolean;
  } = {}
): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const {
    allowedTags = ALLOWED_TAGS,
    allowedCssProperties = ALLOWED_CSS_PROPERTIES,
    stripComments = true,
    stripWhitespace = false,
    allowImages = true,
    allowLinks = true,
    allowScripts = false
  } = options;

  // Remove dangerous patterns
  let sanitized = html;
  DANGEROUS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Remove comments if requested
  if (stripComments) {
    sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');
  }

  // Remove whitespace if requested
  if (stripWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
  }

  // Check if we're in a browser environment with DOMParser
  if (typeof DOMParser !== 'undefined') {
    // Create a temporary DOM element to parse and sanitize
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, 'text/html');

    // Sanitize the document
    sanitizeNode(doc.body, allowedTags, allowedCssProperties, allowImages, allowLinks);

    // If scripts are not allowed, remove all script tags
    if (!allowScripts) {
      const scripts = doc.querySelectorAll('script');
      scripts.forEach(script => script.remove());
    }

    return doc.body.innerHTML;
  } else {
    // Server-side fallback: basic sanitization without DOM parsing
    return basicHtmlClean(sanitized);
  }
}

/**
 * Sanitize a DOM node recursively
 */
function sanitizeNode(
  node: Node,
  allowedTags: Record<string, string[]>,
  allowedCssProperties: string[],
  allowImages: boolean,
  allowLinks: boolean
): void {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    // Remove disallowed tags
    if (!allowedTags[tagName]) {
      element.remove();
      return;
    }

    // Remove disallowed images and links
    if ((tagName === 'img' && !allowImages) || (tagName === 'a' && !allowLinks)) {
      element.remove();
      return;
    }

    // Sanitize attributes
    const allowedAttrs = allowedTags[tagName];
    const attrsToRemove: string[] = [];

    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      const attrName = attr.name.toLowerCase();

      // Remove disallowed attributes
      if (!allowedAttrs.includes(attrName)) {
        attrsToRemove.push(attrName);
        continue;
      }

      // Sanitize specific attributes
      if (attrName === 'href' || attrName === 'src') {
        if (!isValidUrl(attr.value)) {
          attrsToRemove.push(attrName);
        }
      } else if (attrName === 'style') {
        const sanitizedStyle = sanitizeCss(attr.value, allowedCssProperties);
        if (sanitizedStyle) {
          element.setAttribute('style', sanitizedStyle);
        } else {
          attrsToRemove.push(attrName);
        }
      } else if (attrName === 'class') {
        const classes = attr.value.split(' ').filter(isValidClassName);
        if (classes.length > 0) {
          element.setAttribute('class', classes.join(' '));
        } else {
          attrsToRemove.push(attrName);
        }
      }
    }

    // Remove disallowed attributes
    attrsToRemove.forEach(attrName => {
      element.removeAttribute(attrName);
    });

    // Recursively sanitize child nodes
    const children = Array.from(element.childNodes);
    children.forEach(child => sanitizeNode(child, allowedTags, allowedCssProperties, allowImages, allowLinks));
  }
}

/**
 * Check if a URL is valid and safe
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ALLOWED_URL_SCHEMES.includes(urlObj.protocol.replace(':', ''));
  } catch {
    return false;
  }
}

/**
 * Check if an image URL is valid
 */
function isValidImageUrl(url: string): boolean {
  if (!isValidUrl(url)) {
    return false;
  }
  
  const urlObj = new URL(url);
  const extension = urlObj.pathname.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  
  return allowedExtensions.includes(extension || '');
}

/**
 * Check if a class name is valid
 */
function isValidClassName(className: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(className);
}

/**
 * Sanitize CSS
 */
function sanitizeCss(css: string, allowedProperties: string[]): string {
  const properties = css.split(';').filter(prop => {
    const [property] = prop.split(':');
    if (!property) return false;
    
    const cleanProperty = property.trim().toLowerCase();
    return allowedProperties.includes(cleanProperty);
  });

  return properties.join(';');
}

/**
 * Basic HTML cleaning for simple text
 */
export function basicHtmlClean(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize plain text
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return basicHtmlClean(text.trim());
}

/**
 * Create a safe HTML element
 */
export function createSafeElement(tag: string, content: string, attributes: Record<string, string> = {}): string {
  const allowedTag = tag.toLowerCase();
  if (!ALLOWED_TAGS[allowedTag]) {
    return basicHtmlClean(content);
  }

  const safeAttributes = Object.entries(attributes)
    .filter(([key]) => ALLOWED_TAGS[allowedTag].includes(key.toLowerCase()))
    .map(([key, value]) => `${key}="${basicHtmlClean(value)}"`)
    .join(' ');

  const openTag = safeAttributes ? `<${allowedTag} ${safeAttributes}>` : `<${allowedTag}>`;
  return `${openTag}${basicHtmlClean(content)}</${allowedTag}>`;
}

/**
 * Hook for safe HTML rendering in React
 */
export function useSafeHtml(html: string, options?: Parameters<typeof sanitizeHtml>[1]) {
  return sanitizeHtml(html, options);
}

// Export types
export interface SanitizeOptions {
  allowedTags?: Record<string, string[]>;
  allowedAttributes?: Record<string, string[]>;
  allowedCssProperties?: string[];
  stripComments?: boolean;
  stripWhitespace?: boolean;
  allowImages?: boolean;
  allowLinks?: boolean;
  allowScripts?: boolean;
}
