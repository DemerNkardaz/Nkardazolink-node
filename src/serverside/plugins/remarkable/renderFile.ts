import { Remarkable } from 'remarkable';
import { readFile } from 'fs/promises';

interface Data {
  [key: string]: any;
}

const renderFilePlugin = (md: Remarkable) => {
  md.renderer.rules.customBlock = (tokens, idx, options, env, instance) => {
    // Здесь можно добавить логику для обработки вашего кастомного блока
    return '';
  };

  md.renderer.rules.customInline = (tokens, idx, options, env, instance) => {
    // Здесь можно добавить логику для обработки вашего кастомного инлайн-элемента
    return '';
  };
};

export class RemarkableWithRenderFile extends Remarkable {
  constructor(options?: any) {
    super('', options);
    renderFilePlugin(this);
  }

  async renderFile(filePath: string, data: Data): Promise<string> {
    const fileContent = await readFile(filePath, 'utf8');
    const parsedContent = fileContent
      .replace(/%{([\s\S]*?)\}%/g, (match, code) => {
        try {
          const boundFunction = new Function('data', code).bind(null, data);
          return boundFunction();
        } catch (err) {
          console.log(err);
          return match;
        }
      })
      .replace(/\${((?!{[^{]*}).*?)}/g, (match, code) => {
        const varLink = code.match(/\.[\s\S]*?\)/g)
          ? code.replace(/\.[\s\S]*?\)/g, '').split('.').map(key => `[\"${key}\"]`).join('')
          : !code.includes('(') ? code.split('.').map(key => `[\"${key}\"]`).join('') : code;
        const varMethods = code.match(/(\.\w+\(.*?\))/g) ? code.match(/(\.\w+\(.*?\))/g).join('') : '';
        try {
          return new Function('data', `return data${varLink}${varMethods}`)(data);
        } catch (err) {
          try {
            return new Function('data', `return ${code}`)(data);
          } catch (err) {
            console.log(err);
          }
        }
      });

    return this.render(parsedContent, {});
  }
}
