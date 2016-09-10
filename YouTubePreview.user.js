// ==UserScript==
// @name         YouTube Preview
// @author       sooqua
// @namespace    https://github.com/sooqua/
// @downloadURL  https://raw.githubusercontent.com/sooqua/YouTube-Preview/master/YouTubePreview.user.js
// @version      0.5
// @description  A userscript to play youtube videos by hovering over their thumbnails.
// @match        *://*.youtube.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

var APIready = new Promise(function(resolve) {
    window.onYouTubeIframeAPIReady = resolve;
});

(function() {
    'use strict';

    function init() {
        // requesting api
        var scriptTag = document.createElement('script');
        scriptTag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag);

        addGlobalStyle(
            ".player-api { z-index: 1 !important; } " +

            ".yt-lockup-thumbnail,.thumb-wrapper { " +
            "-webkit-transition: all 200ms ease-in !important; " +
            "-webkit-transform: scale(1) !important; " +
            "-ms-transition: all 200ms ease-in !important; " +
            "-ms-transform: scale(1) !important; " +
            "-moz-transition: all 200ms ease-in !important; " +
            "-moz-transform: scale(1) !important; " +
            "transition: all 200ms ease-in !important; " +
            "transform: scale(1) !important; " +
            "} " +

            ".yt-lockup-thumbnail:hover,.thumb-wrapper:hover { " +
            "z-index: 9999999999; " +
            "box-shadow: 0px 0px 100px #000000 !important; " +
            "-webkit-transition: all 200ms ease-in !important; " +
            "-webkit-transform: scale(2.0) !important; " +
            "-ms-transition: all 200ms ease-in !important; " +
            "-ms-transform: scale(2.0) !important; " +
            "-moz-transition: all 200ms ease-in !important; " +
            "-moz-transform: scale(2.0) !important; " +
            "transition: all 200ms ease-in !important; " +
            "transform: scale(2.0) !important; " +
            "} " +

            ".yt-thumb.video-thumb, .yt-uix-simple-thumb-wrap.yt-uix-simple-thumb-related { " +
            "background-color: black !important; " +
            "} " +

            ".xspinner { " +
            "pointer-events: none; " +
            "position: absolute; " +
            "top: 0; " +
            "right: 0; " +
            "bottom: 0; " +
            "left: 0; " +
            "background: rgba(255,255,255,0.5); " +
            "font-size: 14px; " +
            "text-align: center; " +
            "line-height: 2; " +
            "color: rgb(0,0,0); " +
            "font-weight: bold; " +
            "} ");

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
                if(thumbnail.overlocker) return;
                thumbnail.overlocker = new Promise(function (unlock) {
                    var spinner = document.createElement('div');
                    spinner.className = 'xspinner';
                    spinner.textContent = 'Loading...';

                    var childThumb = thumbnail.querySelector('.yt-thumb.video-thumb, .yt-uix-simple-thumb-wrap.yt-uix-simple-thumb-related');
                    childThumb.appendChild(spinner);

                    thumbnail.watchedContainer = [];
                    for (var el = thumbnail; el; el = el.parentElement) {
                        if (el.classList.contains('watched')) {
                            thumbnail.watchedContainer.push(el);
                            el.classList.remove('watched');
                        }
                    }
                    thumbnail.watchedBadgeContainer = [];
                    [].forEach.call(thumbnail.parentNode.querySelectorAll('.watched-badge'), function (watchedBadge) {
                        thumbnail.watchedBadgeContainer.push(watchedBadge);
                        watchedBadge.style.display = 'none';
                    });
                    thumbnail.imageContainer = [];
                    [].forEach.call(thumbnail.getElementsByTagName('img'), function(img) {
                        thumbnail.imageContainer.push(img);
                        img.style.opacity = 0;
                    });

                    var vidId = thumbnail.href.split('v=')[1];
                    loadLinks(vidId).then(function (links) {
                        // video not ciphered, creating simple html5 player
                        thumbnail.HPlayer = new Promise(function (resolve) {
                            var HPlayer = document.createElement('video');
                            HPlayer.style.position = 'absolute';
                            HPlayer.style.width = childThumb.offsetWidth + 'px';
                            HPlayer.style.height = childThumb.offsetHeight + 'px';
                            HPlayer.style.zIndex = '1';
                            HPlayer.controls = false;
                            HPlayer.autoplay = true;
                            for (var i = 0; i < links.length; i++) {
                                if (links[i].quality === "medium" && links[i].filetype === "mp4") {
                                    HPlayer.src = links[i].src;
                                    break;
                                }
                            }
                            HPlayer.onloadedmetadata = resolve(HPlayer);
                            childThumb.insertBefore(HPlayer, childThumb.firstChild);
                        });
                        thumbnail.HPlayer.then(function (HPlayer) {
                            childThumb.removeChild(spinner);

                            thumbnail.parentNode.addEventListener('mousemove', function (evt) {
                                if (!HPlayer) return;
                                if (HPlayer.readyState === 4) {
                                    if(thumbnail.lastX !== evt.screenX || thumbnail.lastY !== evt.screenY) {
                                        HPlayer.currentTime = HPlayer.duration * evt.offsetX / thumbnail.parentElement.offsetWidth;
                                        if(HPlayer.paused)
                                            HPlayer.play();
                                    }
                                    thumbnail.lastX = evt.screenX;
                                    thumbnail.lastY = evt.screenY;
                                }
                            });

                            unlock();
                        });

                    }).catch(function () {
                        // video is ciphered, loading youtube player
                        thumbnail.PPlayer = new Promise(function (resolve) {
                            var playerTag = document.createElement('div');
                            playerTag.id = vidId;
                            playerTag.style.pointerEvents = 'none';
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
                                        'modestbranding': 1, 'ps': 'docs', 'iv_load_policy': 3, 'rel': 0,
                                        'vq': 'medium'
                                    },
                                    events: {
                                        'onReady': function () {
                                            resolve(pplayer);
                                        }
                                    }
                                });
                            });
                        });
                        thumbnail.PPlayer.then(function (PPlayer) {
                            childThumb.removeChild(spinner);

                            thumbnail.parentNode.addEventListener('mousemove', function (evt) {
                                if (!PPlayer) return;
                                if(thumbnail.lastX !== evt.screenX || thumbnail.lastY !== evt.screenY) {
                                    try {
                                        PPlayer.seekTo(PPlayer.getDuration() * evt.offsetX / thumbnail.parentElement.offsetWidth, true);
                                    } catch (e) {}
                                }
                                thumbnail.lastX = evt.screenX;
                                thumbnail.lastY = evt.screenY;
                            });

                            unlock();
                        });

                    });
                });
            });

            thumbnail.parentNode.addEventListener('mouseout', function(evt) {
                if(!thumbnail.overlocker) return;
                thumbnail.overlocker.then(function () {
                    if(thumbnail.contains(evt.relatedTarget)) return;
                    if(thumbnail.watchedContainer) {
                        for (var i = 0; i < thumbnail.watchedContainer.length; i++)
                            thumbnail.watchedContainer[i].classList.add('watched');
                        thumbnail.watchedContainer = null;
                    }
                    if(thumbnail.watchedBadgeContainer) {
                        for (var i = 0; i < thumbnail.watchedBadgeContainer.length; i++)
                            thumbnail.watchedBadgeContainer[i].style.display = null;
                        thumbnail.watchedBadgeContainer = null;
                    }
                    if(thumbnail.imageContainer) {
                        for (var i = 0; i < thumbnail.imageContainer.length; i++)
                            thumbnail.imageContainer[i].style.opacity = null;
                        thumbnail.imageContainer = null;
                    }

                    if(thumbnail.PPlayer) {
                        thumbnail.PPlayer.then(function(PPlayer) {
                            if(PPlayer.a.parentNode)
                                PPlayer.a.parentNode.removeChild(PPlayer.a);
                            thumbnail.PPlayer = null;
                            thumbnail.overlocker = null;
                        });
                    }
                    else if(thumbnail.HPlayer) {
                        thumbnail.HPlayer.then(function (HPlayer) {
                            HPlayer.pause();
                            HPlayer.src='';
                            HPlayer.load();
                            if(HPlayer.parentNode) {
                                HPlayer.parentNode.removeChild(HPlayer);
                            }
                            thumbnail.HPlayer = null;
                            thumbnail.overlocker = null;
                        });
                    }
                    else {
                        thumbnail.overlocker = null;
                    }
                });
            });

        });
    }

    function loadLinks(vidId) {
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', 'https://www.youtube.com/get_video_info?video_id=' + vidId, true);
            xhr.addEventListener('load', function () {
                var result = [];
                var input = xhr.responseText;
                if (input.indexOf('status=fail') !== -1) {
                    reject();
                    return;
                }
                if (input.indexOf('use_cipher_signature=True') !== -1) {
                    reject();
                    return;
                }
                var token = 'url_encoded_fmt_stream_map';
                input = input.split('&');
                for (var i = 0; i < input.length; i++) {
                    if (input[i].indexOf(token) === 0) {
                        input = decodeURIComponent(input[i].substr(token.length + 1));
                        input = input && input.split(',');
                        break;
                    }
                }
                if (input) {
                    for (i = 0; i < input.length; i++) {
                        var url = input[i].split('&');
                        var obj = {};
                        for (var j = 0; j < url.length; j++) {
                            var pair = url[j].split('=');
                            switch (pair[0]) {
                                case 'quality':
                                    obj.quality = decodeURIComponent(pair[1]);
                                    break;
                                case 'type':
                                    obj.filetype = decodeURIComponent(pair[1]).split(';')[0];
                                    obj.filetype = obj.filetype && obj.filetype.replace('video/', '');
                                    break;
                                case 'url':
                                    obj.src = decodeURIComponent(pair[1]);
                                    break;
                            }
                        }
                        result.push(obj);
                    }
                }
                resolve(result);
            });
            xhr.send();
        });
    }

    function addGlobalStyle(css) {
        var head = document.getElementsByTagName('head')[0];
        if (!head) { return; }
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

    init();
})();
