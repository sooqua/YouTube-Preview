// ==UserScript==
// @name         YouTube Preview
// @namespace    https://github.com/sooqua/
// @downloadURL  https://raw.githubusercontent.com/sooqua/YouTube-Preview/master/YouTubePreview.user.js
// @version      0.1
// @description  Preview youtube thumbnail
// @match        *://*.youtube.com/*
// @run-at       document-end
// ==/UserScript==

var APIready = new Promise(function(resolve) {
    onYouTubeIframeAPIReady = resolve;
});

(function() {
    'use strict';

    function init() {
        // requesting api
        var scriptTag = document.createElement('script');
        scriptTag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag);

        initOn(document);
        var mo = new MutationObserver(function(muts) {
            muts.forEach(function(mut) {
                [].forEach.call(mut.addedNodes, function(node) {
                    if (node instanceof HTMLElement) {
                        initOn(node);
                    }
                });
            });
        });
        mo.observe(document.body, {childList: true, subtree: true});
    }

    function initOn(base) {
        [].forEach.call(base.querySelectorAll('.yt-lockup-thumbnail:not(.yt-pl-thumb) a[href^="/watch"], .thumb-wrapper a[href^="/watch"]'), function(thumbnail) {

            thumbnail.parentNode.addEventListener('mouseover', function() {
                if (thumbnail.spinner) { thumbnail.spinner.style.display = null; }
                var spinner = document.createElement('div');
                spinner.style.position = 'absolute';
                spinner.style.top = '0';
                spinner.style.right = '0';
                spinner.style.bottom = '0';
                spinner.style.left = '0';
                spinner.style.background = 'rgba(255,255,255,0.5)';
                spinner.style.fontSize = '14px';
                spinner.style.textAlign = 'center';
                spinner.style.lineHeight = '2';
                spinner.style.color = 'rgb(0,0,0)';
                spinner.style.fontWeight = 'bold';
                spinner.textContent = 'Loading...';
                var childThumb = thumbnail.querySelector('.yt-thumb.video-thumb, .yt-uix-simple-thumb-wrap.yt-uix-simple-thumb-related');
                childThumb.appendChild(spinner);

                thumbnail.watchedContainer = [];
                for (var el = thumbnail.parentElement; el; el = el.parentElement) {
                    if(el.classList.contains('watched')) {
                        thumbnail.watchedContainer.push(el);
                        el.classList.remove('watched');
                    }
                }
                thumbnail.watchedBadgeContainer = [];
                [].forEach.call(thumbnail.querySelectorAll('.watched-badge'), function(watchedBadge) {
                    thumbnail.watchedBadgeContainer.push(watchedBadge);
                    watchedBadge.style.display = 'none';
                });

                var vidId = thumbnail.href.split('v=')[1];
                thumbnail.PPlayer = new Promise(function (resolve, reject) {
                    var playerTag = document.createElement('div');
                    playerTag.id = vidId;
                    playerTag.style.position = 'absolute';
                    playerTag.style.zIndex = '1';
                    childThumb.insertBefore(playerTag, childThumb.firstChild);
                    APIready.then(function () {
                        var pplayer = new YT.Player(playerTag.id, {
                            width: childThumb.offsetWidth,
                            height: childThumb.offsetHeight,
                            videoId: vidId,
                            playerVars: {
                                'enablejsapi': 1, 'autoplay': 1, 'showinfo': 0, 'controls': 0,
                                'modestbranding': 1, 'ps': 'docs'
                            },
                            events: {
                                'onReady': function (event) {
                                    resolve(pplayer);
                                }
                            }
                        });
                    });
                });
                thumbnail.PPlayer.then(function(PPlayer) {
                    childThumb.removeChild(spinner);
                });
            });

            thumbnail.parentNode.addEventListener('mousemove', function(evt) {
                if (!thumbnail.PPlayer || thumbnail.spinner) return;
                thumbnail.PPlayer.then(function(PPlayer) {
                    PPlayer.seekTo(PPlayer.getDuration() * evt.offsetX / thumbnail.parentNode.offsetWidth, true);
                });
            });

            thumbnail.parentNode.addEventListener('mouseout', function(evt) {
                if (thumbnail.spinner) {
                    thumbnail.spinner.style.display = 'none';
                    return;
                }

                for(var i = 0; i < thumbnail.watchedContainer.length; i++)
                    thumbnail.watchedContainer[i].classList.add('watched');
                thumbnail.watchedContainer = [];
                for(i = 0; i < thumbnail.watchedBadgeContainer.length; i++)
                    thumbnail.watchedBadgeContainer[i].style.display = null;
                thumbnail.watchedBadgeContainer = [];

                if(!thumbnail.PPlayer) return;
                thumbnail.PPlayer.then(function(PPlayer) {
                    PPlayer.a.parentNode.removeChild(PPlayer.a);
                });
            });

        });
    }

    init();
})();
