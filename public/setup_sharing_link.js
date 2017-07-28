// These calls are utility ones and are not related to the Collaborative.js functionality
updatePageUrl();
renderSharingLink();

/**
 * Renders a sharing link, so you can play around with the demo in two separate windows or
 * share it with a friend.
 */
function renderSharingLink() {
  var $shareLink = $('#sharing-link');
  $shareLink.attr('href', document.location.href);
  $shareLink.html(document.location.href);
}

/**
 * Updates page URL with document id, so you may copy page URL from the browser address bar
 * to open it in a separate window or share it with a friend.
 */
function updatePageUrl() {
  var path = '/' + site.document.id;
  if (window.location.pathname !== path) {
    if (history) history.replaceState(null, null, path);
    else window.location.replace(path);
  }
}