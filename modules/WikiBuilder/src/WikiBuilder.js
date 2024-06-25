class WikiBuilder {
  constructor(pageContent) {
    this.pageContent = pageContent;
    this.build = this.#handlePage();
  }

  async #handlePage() {
    try {
      let result;
      const articleDOM = await new JSDOM(`<!DOCTYPE html><body>${await new WikiMarkup().render(this.pageContent)}</body>`).window.document;

      
      const articleHeadings = articleDOM.querySelectorAll('h2.nw-article-heading-l2__title');

      {
        const nonHeadedWrapper = articleDOM.createElement('div');
        nonHeadedWrapper.className = 'nw-article-initial-wrapper';

        let currentElement = articleDOM.body.firstChild;

        while (currentElement && currentElement !== articleHeadings[0]) {
          const nextElement = currentElement.nextSibling;
          nonHeadedWrapper.appendChild(currentElement);
          currentElement = nextElement;
        }

        articleDOM.body.insertBefore(nonHeadedWrapper, articleHeadings[0]);
      }

      articleHeadings.forEach((heading) => {
        heading.insertAdjacentHTML('afterend', '<hr class="nw-article-heading-l2-segment__separator">');
        const wrapper = articleDOM.createElement('div');
        wrapper.className = 'nw-article-heading-l2-segment-wrapper';

        wrapper.appendChild(heading.cloneNode(true));

        let sibling = heading.nextSibling;
        while (sibling && sibling.nodeName !== 'H2') {
          const nextSibling = sibling.nextSibling;
          wrapper.appendChild(sibling);
          sibling = nextSibling;
        }

        heading.parentNode.insertBefore(wrapper, heading);
        heading.remove();
      });

      result = articleDOM.body;
      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}

module.exports = { WikiBuilder };
