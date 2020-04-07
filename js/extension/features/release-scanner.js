/**
 *
 * Discogs Enhancer
 *
 * @author: Matthew Salcido
 * @website: http://www.msalcido.com
 * @github: https://github.com/salcido
 */

rl.ready(() => {

  let opts = rl.getPreference('scan'),
      colorize = opts && opts.wants ? opts.wants : null,
      interval = opts && opts.int ? Number(opts.int) : 1000,
      releases = [...document.querySelectorAll('.card td.image a')].map(r => r.href),
      skittles = document.querySelectorAll('.skittles .skittles'),
      checkbox = document.querySelectorAll('td.mr_checkbox'),
      button = '<button class="buy_release_button button button-green de-scan-releases">Scan Releases</button>';

  // ========================================================
  // Functions
  // ========================================================
  /**
   * Fetches a page and extracts the comment count from it
   * @param {String} url - The URL to fetch data from
   * @returns {Number} - The number of comments on the page
   */
  async function fetchRelease(url) {

    try {

      let response = await fetch(url),
          data = await response.text(),
          div = document.createElement('div'),
          reviewCount,
          haves,
          wants,
          rating,
          votes,
          moreWants;

      div.innerHTML = data;
      reviewCount = div.querySelectorAll('.review').length || 0;

      // Check for blocked releases
      if ( div.querySelector('.coll_num') ) {
        haves = Number(div.querySelector('.coll_num').textContent);
        wants = Number(div.querySelector('.want_num').textContent);
        rating = div.querySelector('.rating_value').textContent;
        votes = div.querySelector('.rating_count').textContent;
      } else {
        haves = 0;
        wants = 0;
        rating = null;
        votes = null;
      }

      moreWants = wants > (haves * 1.9);

      return { reviewCount, moreWants, rating, votes };

    } catch (err) {

      console.error('Could not fetch release count for: ', url, err);
    }
  }

  /**
   * Appends preloading spinners to the page while
   * the fetch requests are running.
   * @returns {HTMLElement} - The preloader markup
   */
  function appendSpinners() {
    document.querySelectorAll('.card td.image a').forEach((r,i) => {
      let preloader = '<i class="icon icon-spinner icon-spin de-loader" style="font-style: normal;"></i>';
      return (skittles[i] || checkbox[i]).insertAdjacentHTML('beforeend', preloader);
    });
  }

  /**
   * Appends a skittle next to the release that was scanned
   * @param {Object} data - The number of comments and whether there are more wants than haves
   * @param {Number} position - The index position of the individual release in the releases list
   * @returns {HTMLElement | null}
   */
  function appendCount(data, position) {

    let badge,
        { reviewCount:count, moreWants } = data;
    // add position to `data` for grabbing href to append to badge for badge clicks
    data.position = position;
    badge = createBadge(data);

    return count || colorize && moreWants ? (skittles[position] || checkbox[position]).insertAdjacentHTML('beforeend', badge) : null;
  }

  /**
   * Evaluates the data and returns the appropriate badge markup
   * @param {Object} data - An object of release attributes
   * @returns {HTMLElement | null}
   */
  function createBadge(data) {

    let { reviewCount, moreWants, rating, votes, position } = data,
        color = (moreWants && colorize) ? '#a200ff' : '#585858',
        count,
        badge;

    if ( reviewCount > 0 ) {
      count = reviewCount;
    } else if ( reviewCount === 0 && moreWants ) {
      count = '&nbsp;&nbsp;';
    } else if ( reviewCount <= 0 && !moreWants ) {
      count = null;
    }

    badge = `<a href="${releases[position]}" target="_blank" rel="noopener">
              <span class="skittle de-scan-badge" style="background:${color} !important;">
                <span style="color:white !important;">${count}</span>
                <div class="tooltip fade top in de-scan-tooltip">
                  <div class="tooltip-arrow"></div>
                  <div class="tooltip-inner">
                    Rating: ${rating} / 5
                    <br>
                    Votes: ${votes}
                  </div>
                </div>
              </span>
            </a>`;

    return badge;
  }

  /**
   * Modifies the links on the page to open them in new tabs
   * @returns {Undefined}
   */
  function openInNewTabs() {
    let anchors = document.querySelectorAll('.card td.image a, .card .title a, .card .artist a');
    anchors.forEach(a => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    });
  }

  /**
   * Delays a promise for a specified amount of time
   * @param {Number} ms - The request delay time in milliseconds
   * @returns {Promise}
   */
  function promiseDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Iterates over an array of release urls and appends
   * badges when necessary
   * @param {Array} urls - An array of urls to request
   * @param {Number} delay - The time in milliseconds to delay each request
   * @returns {Array} - An array of comment counts for each URL
   */
  async function scanReleases(urls, delay) {

    let button = document.querySelector('.de-scan-releases'),
        responses = [],
        index = 0;

    rl.attachCss('scan-badges', rules);
    appendSpinners();
    openInNewTabs();
    button.disabled = true;
    button.textContent = 'Scanning...';

    for ( let url of urls ) {

      try {
        let data = await fetchRelease(url);

        document.querySelector('.de-loader').remove();
        appendCount(data, index);
        index++;
        responses.push(data);

      } catch (err) {
        responses.push(null);
      }
      await promiseDelay(delay);
    }

    button.textContent = 'Scan Complete';
    return responses;
  }

  // ========================================================
  // CSS
  // ========================================================
  let rules = `
      .de-scan-badge {
        position: relative;
        cursor: pointer;
      }

      .de-scan-badge .de-scan-tooltip {
        position: absolute;
        display: none;
        top: -40px;
        left: -42px;
        font-weight: normal;
      }

      .de-scan-badge:hover .de-scan-tooltip {
        display: block;
      }`;

  // ========================================================
  // DOM Setup
  // ========================================================
  if ( rl.pageIs('history') ) return;

  if ( rl.pageIs('artist', 'label') ) {

    let selector = '.section_content.marketplace_box_buttons_count_1';

    if ( document.querySelector(selector) ) {

      document.querySelector(selector).insertAdjacentHTML('beforeend', button);

      // Event Listeners
      // ------------------------------------------------------
      document.querySelector('.de-scan-releases').addEventListener('click', () => {
        scanReleases(releases, interval)
          .then(res => res)
          .catch(err => console.error(err));
      });
    }
  }
});
/**
// ========================================================
Me and him, we're from different ancient tribes.
And now, we're both almost extinct.
Sometimes you gotta stick with the ancient ways,
the old school ways. I know you understand me.
https://www.discogs.com/Burial-Burial/master/11767
// ========================================================
 */
