const fs = require('fs').promises;
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

      return `<a href="${href}"${classSegment ? ` class="${classSegment}"` : ''}${attribSegment ?? ''} title="${alt}"><img src="${src}" srcset="${srcSet}" alt="${alt}" decoding="async" loading="lazy"></a>`;
    }],

  linksLabeled: [/\[\[([^[\]]*?(?:\[[^[\]]]*?\][^[\]]*?)*?)\|([^[\]]*?(?:\[[^[\]]]*?\][^[\]]*?)*?)\]\]/g,
    (match, p1, p2) => `<a href="/wiki/${sp2undr(p1)}" title="${p2}">${p2}</a>`],
  links: [/\[\[([^[\]]*(?:\[[^[\]]*\][^[\]]*)*)\]\]/g,
    (match, p1) => `<a href="/wiki/${sp2undr(p1)}" title="${p1}">${p1}</a>`],

  // ? INVALID RULES
  // TODO: FIX IT
  bulletList: [/(^|\n)(\*+)\s(.*?)(?=\n|$)/g, (match, p1, p2, p3) => {
    let level = p2.length;
    return `${p1}<ul>${'<li>'.repeat(level)}${p3}${'</li>'.repeat(level)}</ul>`;
  }],
  numberedList: [/(^|\n)(#+)\s(.*?)(?=\n|$)/g, (match, p1, p2, p3) => {
    let level = p2.length;
    return `${p1}<ol>${'<li>'.repeat(level)}${p3}${'</li>'.repeat(level)}</ol>`;
  }],
  definitionList: [/(^|\n);(.*?)\n: (.*?)(?=\n|$)/g, (match, p1, p2, p3) => {
    return `${p1}<dl><dt>${p2}</dt><dd>${p3}</dd></dl>`;
  }],
  nestedDefinitionList: [/(^|\n)([:]+)(.*?)(?=\n|$)/g, (match, p1, p2, p3) => {
    let level = p2.length;
    return `${p1}${'<dd>'.repeat(level)}${p3}${'</dd>'.repeat(level)}`;
  }],
  mixedList: [/(^|\n)([\*\#\;:]+)\s(.*?)(?=\n|$)/g, (match, p1, p2, p3) => {
    let tag;
    if (p2[0] === '*') tag = 'ul';
    else if (p2[0] === '#') tag = 'ol';
    else if (p2[0] === ';') tag = 'dl';
    else if (p2[0] === ':') tag = 'dd';
    return `${p1}<${tag}><li>${p3}</li></${tag}>`;
  }],
  paragraphs: [/(?:<[^>]+>|\s*\n)+|([\s\S]+?)(?=(?:<[^>]+>|\s*\n)+|$)/g, (match, p1) => { if (p1) return '<p>$1</p>\n' }]
}


class WikiMarkup {
  constructor(options) {
    Object.assign(this, {
      linkify: options.linkify || false,
    });

  }

  async render(text) {
    try {

    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      return text;
    }
  }

  async renderFile(filePath, data) {
    const fileContent = await fs.readFile(filePath, 'utf8');
    try {

    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      return fileContent;
    }
  }
}


module.exports = { WikiMarkup }