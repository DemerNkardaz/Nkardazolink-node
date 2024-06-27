class WikiBuilder {
  constructor(pageContent, request) {
    this.pageContent = pageContent;
    this.activeTab = request.params.subPage ? underline2space(request.params.subPage) : null;
    this.page = request.params.page;
    this.build = this.#handlePage();
    console.log(this.activeTab);
  }

  async #handlePage() {
    try {
      let result;
      const dom = new JSDOM(`<!DOCTYPE html><body>${await new WikiMarkup().render(this.pageContent)}</body>`);
      const articleDOM = dom.window.document;
      

      let sections = articleDOM.querySelectorAll('body > .nw-article-tab__content');

      if (sections.length === 0) {
        const defaultSection = articleDOM.createElement('section');
        defaultSection.className = 'nw-article-tab__content';
        defaultSection.setAttribute('role', 'tabpanel');
        defaultSection.id = 'article-content-panel';
        defaultSection.setAttribute('aria-labelledby', 'article-content');

        while (articleDOM.body.firstChild) {
          defaultSection.appendChild(articleDOM.body.firstChild);
        }

        articleDOM.body.appendChild(defaultSection);

        sections = articleDOM.querySelectorAll('body > .nw-article-tab__content');
      }

      sections.forEach((section) => {
        const articleSegmentedHeadings = section.querySelectorAll('h2.nw-article-heading-l2__title');
        const articleHeadings = section.querySelectorAll('h2');

        if (articleSegmentedHeadings.length > 0) {
          const nonHeadedWrapper = articleDOM.createElement('div');
          nonHeadedWrapper.className = 'nw-article-initial-wrapper';

          let currentElement = section.firstChild;

          while (currentElement && currentElement !== articleSegmentedHeadings[0]) {
            const nextElement = currentElement.nextSibling;
            nonHeadedWrapper.appendChild(currentElement);
            currentElement = nextElement;
          }

          section.insertBefore(nonHeadedWrapper, articleSegmentedHeadings[0]);
        }

        articleHeadings.forEach((heading) => heading.insertAdjacentHTML('afterend', '<hr class="nw-article-heading-l2-segment__separator">'));

        articleSegmentedHeadings.forEach((heading) => {
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
      });


      if (sections.length >= 2) {
        const tabsSection = articleDOM.createElement('section');
        tabsSection.className = 'nw-article-tabs';
        tabsSection.setAttribute('role', 'tablist');

        sections.forEach((section, index) => {
          const sectionLabel = section.getAttribute('data-sectionlabel');
          const sectionId = section.id;
          const ariaLabelledBy = section.getAttribute('aria-labelledby');

          const tabButton = articleDOM.createElement('a');
          tabButton.className = 'nw-article-tabs__switch-btn';
          tabButton.setAttribute('href', `/wiki/${this.page}/${space2underline(sectionLabel)}`);
          tabButton.setAttribute('role', 'tab');
          tabButton.id = ariaLabelledBy;
          tabButton.setAttribute('aria-controls', sectionId);
          if (this.activeTab && sectionLabel === this.activeTab) {
            tabButton.setAttribute('aria-selected', 'true');
          } else {
            tabButton.setAttribute('aria-selected', this.activeTab ? 'false' : (index === 0 ? 'true' : 'false'));
          }
          tabButton.setAttribute('data-tab-index', index === sections.length - 1 ? 'last' : index);
          tabButton.setAttribute('type', 'button');
          tabButton.textContent = sectionLabel;

          tabsSection.appendChild(tabButton);
        });

        articleDOM.body.insertBefore(tabsSection, articleDOM.body.firstChild);
      }



      result = articleDOM.body.innerHTML;
      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
module.exports = { WikiBuilder };
