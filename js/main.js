(function () {
    function escapeHTML(str) {
        return String(str).replace(/[&<>'"]/g, function (t) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t);
        });
    }

    var toggle = document.getElementById('menuToggle');
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('overlay');
    function closeMenu() {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
    }
    if (toggle && sidebar) {
        toggle.addEventListener('click', function () {
            var open = sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('show', open);
        });
    }
    if (overlay) overlay.addEventListener('click', closeMenu);

    var filterSelects = document.querySelectorAll('.filter-select');
    for (var fi = 0; fi < filterSelects.length; fi++) {
        filterSelects[fi].addEventListener('change', function () {
            if (this.value) window.location.href = this.value;
        });
    }

    var steamBox = document.getElementById('steamBox');
    if (steamBox) {
        var appid = steamBox.getAttribute('data-appid');
        var priceEl = document.getElementById('steamPrice');
        var buyEl = document.getElementById('steamBuy');
        fetch('/api/steam-price/' + encodeURIComponent(appid))
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!d) { priceEl.textContent = 'See Steam page'; return; }
                if (d.isFree) {
                    priceEl.innerHTML = '<span class="free">Free to Play</span>';
                    if (buyEl) buyEl.textContent = 'Play on Steam';
                    return;
                }
                if (d.ok && d.finalFormatted) {
                    if (d.discountPercent && d.discountPercent > 0 && d.initialFormatted) {
                        priceEl.innerHTML = '<span class="old">' + escapeHTML(d.initialFormatted) + '</span> ' + escapeHTML(d.finalFormatted) + ' <span class="disc">-' + d.discountPercent + '%</span>';
                    } else {
                        priceEl.textContent = d.finalFormatted;
                    }
                    if (buyEl) buyEl.textContent = 'Buy on Steam';
                } else {
                    priceEl.textContent = 'Not yet priced';
                    if (buyEl) buyEl.textContent = 'View on Steam';
                }
            })
            .catch(function () { priceEl.textContent = 'See Steam page'; });
    }

    var lightbox = document.getElementById('lightbox');
    if (lightbox) {
        var lbImg = document.getElementById('lightboxImg');
        function openLB(src, alt) {
            lbImg.src = src;
            lbImg.alt = alt || '';
            lightbox.classList.add('open');
            lightbox.setAttribute('aria-hidden', 'false');
        }
        function closeLB() {
            lightbox.classList.remove('open');
            lightbox.setAttribute('aria-hidden', 'true');
            lbImg.src = '';
        }
        var shotsWrap = document.getElementById('gpShots');
        if (shotsWrap) {
            shotsWrap.addEventListener('click', function (e) {
                var img = e.target.closest('img.shot');
                if (img) openLB(img.src, img.alt);
            });
        }
        var cover = document.querySelector('.gp-cover');
        if (cover) {
            cover.addEventListener('click', function () {
                openLB(cover.src, cover.alt);
            });
        }
        lightbox.addEventListener('click', closeLB);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLB();
        });
    }

    var submitBtn = document.getElementById('submit-comment');
    if (submitBtn) {
        submitBtn.addEventListener('click', function () {
            var gameId = submitBtn.getAttribute('data-game-id');
            var nameI = document.getElementById('comment-name');
            var textI = document.getElementById('comment-text');
            var errD = document.getElementById('comment-error');
            var name = (nameI.value || '').trim();
            var text = (textI.value || '').trim();
            errD.classList.add('gp-hidden');
            if (!name || text.length < 2) {
                errD.innerText = 'Please enter your name and a comment.';
                errD.classList.remove('gp-hidden');
                return;
            }
            var orig = submitBtn.innerText;
            submitBtn.innerText = 'Checking…';
            submitBtn.disabled = true;
            fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game_id: gameId, author_name: name, content: text })
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        textI.value = '';
                        var noMsg = document.getElementById('no-comments-msg');
                        if (noMsg) noMsg.remove();
                        var cnt = document.getElementById('comments-count');
                        cnt.innerText = parseInt(cnt.innerText || '0', 10) + 1;
                        var sn = escapeHTML(data.comment.author_name);
                        var sc = escapeHTML(data.comment.content);
                        var html = '<div class="gp-cmt"><div class="gp-cmt-av">' + sn.charAt(0) + '</div><div class="gp-cmt-main"><div class="gp-cmt-head"><span class="gp-cmt-name">' + sn + '</span><span class="gp-cmt-time">' + escapeHTML(data.comment.timeAgo) + '</span></div><p class="gp-cmt-body">' + sc + '</p><div class="gp-cmt-react"><button class="react-btn" data-id="' + data.comment.id + '" data-type="like">👍 <span>0</span></button><button class="react-btn" data-id="' + data.comment.id + '" data-type="dislike">👎 <span>0</span></button></div></div></div>';
                        document.getElementById('comments-list').insertAdjacentHTML('afterbegin', html);
                    } else {
                        errD.innerText = data.message || 'Could not post comment.';
                        errD.classList.remove('gp-hidden');
                    }
                })
                .catch(function () {
                    errD.innerText = 'Something went wrong. Please try again.';
                    errD.classList.remove('gp-hidden');
                })
                .then(function () {
                    submitBtn.innerText = orig;
                    submitBtn.disabled = false;
                });
        });
    }

    var list = document.getElementById('comments-list');
    if (list) {
        list.addEventListener('click', function (e) {
            var btn = e.target.closest('.react-btn');
            if (!btn) return;
            var id = btn.getAttribute('data-id');
            var type = btn.getAttribute('data-type');
            var reacted = JSON.parse(localStorage.getItem('reacted_comments') || '[]');
            if (reacted.includes(id)) {
                btn.style.opacity = '0.5';
                setTimeout(function () { btn.style.opacity = ''; }, 600);
                return;
            }
            fetch('/api/comments/' + id + '/react', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: type })
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        btn.querySelector('span').innerText = data.count;
                        reacted.push(id);
                        localStorage.setItem('reacted_comments', JSON.stringify(reacted));
                        btn.style.borderColor = '#66c0f4';
                        btn.style.color = '#fff';
                    }
                })
                .catch(function () {});
        });
    }
})();
