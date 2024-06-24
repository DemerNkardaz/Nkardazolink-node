const fs = require('fs').promises;
const { default: axios } = require('axios');
const path = require('path');
const { DOMParser } = require('xmldom');

const sp2undr = (str) => str.replace(/\s/g, '_');

const marks = {
  emstrong: [/!!!!(.*?)!!!!/g, '<em><strong>$1</strong></em>'],
  strong: [/!!!(.*?)!!!/g, '<strong>$1</strong>'],
  em: [/!!(.*?)!!/g, '<em>$1</em>'],
  italicbold: [/''''(.*?)''''/g, '<i><b>$1</b></i>'],
  bold: [/'''(.*?)'''/g, '<b>$1</b>'],
  italic: [/''(.*?)''/g, '<i>$1</i>'],
  supb: [/\{\{(Chemical\snotation|Химическая\sнотация):([^{\}]+)\}\}/g,
    (match, prefix, options) => {
      const notationTemplate = (sup, sub) => `<sub-sup><sup>${sup}</sup><sub>${sub}</sub></sub-sup>`;
      let optionsArray = options.split('|');
      let chemicalElement, leftSegment, rightSegment;

      if (optionsArray.length > 0) {
        chemicalElement = optionsArray[0];
        for (let i = 1; i < optionsArray.length; i++) {
          let option = optionsArray[i];
          if (option.startsWith('l:')) {
            leftSegment = option.replace('l:', '');
          } else if (option.startsWith('r:')) {
            rightSegment = option.replace('r:', '');
          }
        }
      }

      function processSegment(segment) {
        if (segment) {
          const segmentArray = segment.split(';');
          let top, bottom;

          segmentArray.forEach(element => {
            if (element.startsWith('^=')) top = element.replace('^=', '');
            else if (element.startsWith('~=')) bottom = element.replace('~=', '');
          });

          console.log(notationTemplate(top, bottom));
          return notationTemplate(top, bottom);
      
        }
        else return null;
      }

      leftSegment = processSegment(leftSegment);
      rightSegment = processSegment(rightSegment);

      return `<span class="nw-chemical-notation">${leftSegment ?? ''}${chemicalElement}${rightSegment ?? ''}</span>`
    }],
  sub: [/~(.*?)~/g, '<sub>$1</sub>'],
  sup: [/\^(.*?)\^/g, '<sup>$1</sup>'],
  h6: [/======\s(.*?)\s======/g, '<h6>$1</h6>'],
  h5: [/=====\s(.*?)\s=====/g, '<h5>$1</h5>'],
  h4: [/====\s(.*?)\s====/g, '<h4>$1</h4>'],
  h3: [/===\s(.*?)\s===/g, '<h3>$1</h3>'],
  h2: [/==\s(.*?)\s==/g, '<h2>$1</h2>'],
  hr: [/----/g, '<hr>'],
  imageLink: [/\[\[(File|Файл):([^[\]]+)\]\]/g,
    (match, prefix, options) => {
      let optionsArray = options.split('|');
      let fileName, querySegment, classSegment, styleSegment, attribSegment, altText;
      if (optionsArray.length > 0) {
        fileName = optionsArray[0];
        for (let i = 1; i < optionsArray.length; i++) {
          let option = optionsArray[i];
          if (option.startsWith('query:')) {
            querySegment = option.replace('query:', '');
          } else if (option.startsWith('class:')) {
            classSegment = option.replace('class:', '');
            classSegment = `class="${classSegment}"`;
          } else if (option.startsWith('style:')) {
            styleSegment = option.replace('style:', '');
          } else if (option.startsWith('attrib:')) {
            attribSegment = option.replace('attrib:', '');
          } else {
            altText = option;
          }
        }
      }
      let href = prefix === 'Файл' ? `/Файл:${fileName}` : `/File:${fileName}`;
      let src = `/shared/images/${fileName}`;
      let srcSet = `/shared/images/${fileName}`;
      let alt = altText || '';

      if (querySegment) {
        const queryArgs = querySegment.split(';').map(arg => arg.trim());
        let queryParams = '';
        queryArgs.forEach((arg, index) => {
          const [key, value] = arg.split('=').map(part => part.trim());
          if (key && value) {
            if (index === 0) {
              queryParams += `?${key}=${value}`;
            } else {
              queryParams += `&${key}=${value}`;
            }
          }
        });
        srcSet += queryParams;
      }
      if (attribSegment) {
        const attributesMap = attribSegment.split(';').map(arg => arg.trim());
        let attribs = '';
        attributesMap.forEach((arg, index) => {
          const [key, value] = arg.split('=').map(part => part.trim());
          if (key && value) {
              attribs += ` ${key}="${value}"`;
          }
        });
        attribSegment = attribs;
      }

      return `<a href="${href}"${classSegment ?? ''} title="${alt}"><img src="${src}" srcset="${srcSet}" alt="${alt}" decoding="async" loading="lazy"${attribSegment ?? ''}></a>`;
    }],
  linksLabeled: [/\[\[([^[\]]*?(?:\[[^[\]]]*?\][^[\]]*?)*?)\|([^[\]]*?(?:\[[^[\]]]*?\][^[\]]*?)*?)\]\]/g,
    (match, p1, p2) => `<a href="/wiki/${sp2undr(p1)}" title="${p2}">${p2}</a>`],
  links: [/\[\[([^[\]]*(?:\[[^[\]]*\][^[\]]*)*)\]\]/g,
    (match, p1) => `<a href="/wiki/${sp2undr(p1)}" title="${p1}">${p1}</a>`],

  paragraphs: [/^(?![<\s])([^\n]*\S[^\n]*)(\n(?![<\s])([^\n]*\S[^\n]*))*\n(?=\s*\n*$)/gm, (match, p1) => `<p>${p1}</p>`],
}

const allowedTags = [
  'div', 'article', 'section', 'header', 'footer',
  'p', 'blockquote', 'pre', 'code',
  'span', 'a', 'label', 'button',
  'img', 'figure', 'figcaption',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'caption', 'colgroup', 'col', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
  'hr', 'br',
  'h2', 'h3', 'h4', 'h5', 'h6',
  'i', 'b', 'em', 'strong', 'cite', 'q',
  'abbr', 'dfn', 'ins', 'kbd', 'mark', 'del',
  'sub', 'sup', 'u', 'var', 'time', 'wbr',
  'address', 'aside', 'fieldset', 'legend',
  'meter', 'progress', 'video', 'source', 'picture', 'iframe',
  'details', 'summary'
];

class WikiMarkup {
  constructor(options) {

  }

  async render(markup) {
    try {
      Object.values(marks).forEach(([pattern, replacement]) => {
        markup = markup.replace(pattern, replacement);
      });
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      return await markup;
    }
  }
}


module.exports = { WikiMarkup }