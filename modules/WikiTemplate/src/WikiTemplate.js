/*
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
*/

const systemTemplates = {
  'пример-шаблона': `
    <let var='text' val='Default text'/>
    <let var='kanji'/>
    <let var='additional'/>

    <template>
      <use var='text'/> (<a href="https://en.wikipedia.org/wiki/Japanese_language" target="_blank">Japanese:</a> <span lang="ja" class="nw-font-ja"><use var='kanji'/></span><use var='additional' insertAfter=", "/>)
    </template>`
};
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