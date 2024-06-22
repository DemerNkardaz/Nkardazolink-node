document.addEventListener('DOMContentLoaded', () => {
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
});
