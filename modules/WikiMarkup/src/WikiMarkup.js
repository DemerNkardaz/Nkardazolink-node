const space2underline = (str) => str.replace(/\s/g, '_');

const localisedTitles = (obj) => `${obj.text} (<span lang="${obj.lang}" class="nw-font-${obj.lang}">${obj.origin}</span>${obj.add ? `, ${obj.add}` : ''})`;



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
    this.marks = {
      nihongo: [
        /\{\{(nihon-go|нихон-го):([^{\}]+)\}\}/g,
        (match, prefix, options) => {
          let optionsArray = options.split('|');
          let localisedText, originText, additional;

          if (optionsArray.length > 0) {
            localisedText = optionsArray[0];
            originText = optionsArray[1];
            additional = optionsArray[2] ?? null;
          }

          return localisedTitles({ text: localisedText, lang: 'ja', origin: originText, add: additional })
        }],
      transcriptReplacement: [
        /\<\s(.*?)\s\/\>/g,
        (_, result) =>
          result
            .replace(/\/(.*?)\/\?/g, (_, sub) => `<ruby class='ruby_bottom'>${sub}</ruby>`)
            .replace(/\{(.*?)\}/g, (_, sub) => `<ruby>${sub}</ruby>`)
            .replace(/\[(.*?)\]/g, (_, sub) => `<rt>${sub}</rt>`)
            .replace(/\″(.*?)\←(.*?)\″/g, (_, sub1, sub2) => `<ruby>${sub1}<rt>${sub2}</rt></ruby>`)
            .replace(/\(([^:)]+):([^)]+)\)/g, (_, sub1, sub2) => `${sub1}<rt>${sub2}</rt>`)
            .replace(/\((.*?)\?\)/g, (_, sub1) => `${sub1}<rt><!-- --></rt>`)
      ],
      section: [/\{\{(Section|Секция):([^{\}]+)\}\}/g,
        (match, prefix, options) => {
          let optionsArray = options.split('|');
          let sectionTitle, sectionElement;

          if (optionsArray.length > 0) {
            sectionTitle = optionsArray[0];
            sectionElement = optionsArray[1];
          }

          return `<section class="nw-article-tab__content" role="tabpanel" id="article-${sectionElement}-panel" aria-labelledby="article-${sectionElement}" data-sectionlabel="${sectionTitle}">`
        }],
      sectionEnd: [/\{\{(End\ssection|Конец\sсекции)\}\}/g, '</section>'],
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
      h2Segmented: [/==\s\#(.*?)\s==/g, (m, p) => `<h2 class="nw-article-heading-l2__title" id="${space2underline(p)}">${p}</h2>`],
      h6: [/======\s(.*?)\s======/g, (m, p) => `<h6 id="${space2underline(p)}">${p}</h6>`],
      h5: [/=====\s(.*?)\s=====/g, (m, p) => `<h5 id="${space2underline(p)}">${p}</h5>`],
      h4: [/====\s(.*?)\s====/g, (m, p) => `<h4 id="${space2underline(p)}">${p}</h4>`],
      h3: [/===\s(.*?)\s===/g, (m, p) => `<h3 id="${space2underline(p)}">${p}</h3>`],
      h2: [/==\s(.*?)\s==/g, (m, p) => `<h2 id="${space2underline(p)}">${p}</h2>`],
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
        (match, p1, p2) => `<a href="/wiki/${space2underline(p1)}" title="${p2}">${p2}</a>`],
      links: [/\[\[([^[\]]*(?:\[[^[\]]*\][^[\]]*)*)\]\]/g,
        (match, p1) => `<a href="/wiki/${space2underline(p1)}" title="${p1}">${p1}</a>`],

      //paragraphs: [/(?:^|\n)(?!(?:\s*<|^\s*$))(.*(?:\n|$))(?=\n(?:\s*<|\s*$)|$)/gs, (match, p1) => `<p>${p1.trim()}</p>\n` ],
    }
  }

  async render(markup) {
    try {
      Object.values(this.marks).forEach(([pattern, replacement]) => {
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