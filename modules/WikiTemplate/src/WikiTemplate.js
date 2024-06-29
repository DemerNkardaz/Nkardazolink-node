const systemTemplates = {};

systemTemplates.nihongoRU = {
  name: 'нихон-го', template: '<let:text/> (<a href="https://ru.wikipedia.org/wiki/Японский_язык" target="_blank">яп.</a> <span lang="ja" class="nw-font-ja"><let:kanji/></span><let:additional/>)'};




class WikiTemplate {
  constructor(options) {

  }

  async render(markup) {
    try {
      let result;


    } catch (err) {
      console.log(err);
    } finally {
      return await markup;
    }
  }


  #handleTemplate(templateName) {
    
  }
}


module.exports = { WikiTemplate }