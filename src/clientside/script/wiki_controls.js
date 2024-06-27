import utils from './utils.js';
let title;


document.addEventListener('DOMContentLoaded', () => {
  title = document.querySelector('title');
  const defaultActiveTab = document.querySelector('.nw-article-tabs__switch-btn[aria-selected="true"]');
  const defaultActivePanel = document.querySelector(`#${defaultActiveTab.getAttribute('aria-controls')}`);
  defaultActivePanel.classList.add('active');

  const isArticleExpanded = localStorage.getItem('nwArticleExpanded') === 'true';
  if (isArticleExpanded) {
    const article = document.querySelector('.nw-article-page');
    const articleParents = document.querySelectorAll('.nw-root-container__main-block, .nw-root-container');
    const expandButton = document.querySelector('.nw-page-action__expand-page[data-action="expand-article"]');
    articleParents.forEach(parent => parent.style.transition = 'none');
    article.classList.add('nw-article-page--expanded');
    expandButton.setAttribute('data-icon', 'fullscreen_exit');
    setTimeout(() => articleParents.forEach(parent => parent.removeAttribute('style')), 100);
  }

  const editPageButton = document.querySelector('.nw-page-action__edit[data-action="edit-article"]');
  editPageButton.setAttribute('href', `${window.location.href.split('?')[0]}?action=edit`);
});

document.addEventListener('click', function (e) {
  const target = e.target;
  if (target.getAttribute('data-action') === 'expand-article') {
    const article = document.querySelector('.nw-article-page');

    if (target.getAttribute('data-icon') === 'fullscreen') {
      article.classList.add('nw-article-page--expanded');
      target.setAttribute('data-icon', 'fullscreen_exit');
      localStorage.setItem('nwArticleExpanded', 'true');
    } else {
      article.classList.remove('nw-article-page--expanded');
      target.setAttribute('data-icon', 'fullscreen');
      localStorage.setItem('nwArticleExpanded', 'false');
    }
  }

  if (target.classList.contains('nw-article-tabs__switch-btn') && target.getAttribute('aria-controls')) {
    e.preventDefault();
    const articleContentPanels = document.querySelectorAll('.nw-article-tab__content');
    const articleContentTabs = document.querySelectorAll('.nw-article-tabs__switch-btn');
    const getTabState = target.getAttribute('aria-selected') === 'true';

    if (getTabState) {
      return;
    } else {
      articleContentTabs.forEach(tab => tab.setAttribute('aria-selected', 'false'));
      articleContentPanels.forEach(panel => panel.classList.remove('active'));

      target.setAttribute('aria-selected', 'true');

      const switchedPanel = document.querySelector(`#${target.getAttribute('aria-controls')}`);
      const tabTitle = switchedPanel.getAttribute('data-sectionlabel');
      switchedPanel.classList.add('active');

      if (Array.prototype.indexOf.call(articleContentTabs, target) !== 0) {
        history.replaceState({}, '', utils.space2underline(decodeURIComponent(target.href)));
        if (title.textContent.includes('—')) {
          title.textContent = title.textContent.replace(/—\s(.*?)\s\|/, `— ${tabTitle} |`);
        } else {
          title.textContent = title.textContent.replace(/\s(.*?)\s\|/, ` — ${tabTitle} |`);
        }
      } else {
        const targetUrl = new URL(target.href);
        const segments = targetUrl.pathname.split('/');
        const urlWithoutLastSegment = segments.slice(0, -1).join('/');
        const newUrl = `${targetUrl.origin}${urlWithoutLastSegment}`;
        history.replaceState({}, '', newUrl);
        title.textContent = title.textContent.replace(/—\s(.*?)\s\|/, ` |`);
      }
    }
  }
});
