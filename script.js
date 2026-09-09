(function(){
  "use strict";

  function init(){
    /* ---------- Mobile navigation ---------- */
    var navToggle = document.getElementById('nav-toggle');
    var mainNav = document.getElementById('main-nav');

    if(navToggle && mainNav){
      navToggle.addEventListener('click', function(){
        var isOpen = mainNav.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      mainNav.querySelectorAll('a').forEach(function(link){
        link.addEventListener('click', function(){
          mainNav.classList.remove('open');
          navToggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    /* ---------- Cashback estimator ---------- */
    var brokerSelect = document.getElementById('broker-select');
    var rateSelect = document.getElementById('rate-select');
    var lotsInput = document.getElementById('lots-input');
    var estimateOutput = document.getElementById('estimate-output');

    function formatUSD(number){
      return '$' + number.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    var estimateAnimationFrame = null;
    function updateEstimate(){
      var rate = parseFloat(rateSelect.value);
      var lots = parseFloat(lotsInput.value);

      if(!Number.isFinite(rate) || rate < 0) rate = 0;
      if(!Number.isFinite(lots) || lots < 0) lots = 0;

      var target = Number.isFinite(rate * lots) ? rate * lots : 0;
      var start = parseFloat(estimateOutput.dataset.value || '0');
      var started = performance.now();
      if(estimateAnimationFrame) cancelAnimationFrame(estimateAnimationFrame);
      function tick(now){
        var ratio = Math.min(1, (now - started) / 360);
        var eased = 1 - Math.pow(1 - ratio, 3);
        estimateOutput.textContent = formatUSD(start + (target - start) * eased);
        if(ratio < 1) estimateAnimationFrame = requestAnimationFrame(tick);
      }
      estimateOutput.dataset.value = String(target);
      estimateAnimationFrame = requestAnimationFrame(tick);
    }

    if(brokerSelect && rateSelect && lotsInput && estimateOutput){
      brokerSelect.addEventListener('change', updateEstimate);
      rateSelect.addEventListener('change', updateEstimate);
      lotsInput.addEventListener('input', updateEstimate);
      updateEstimate();
    }

    /* ---------- Daily client cashback leaderboard ---------- */
    var leaderboardBody = document.getElementById('leaderboard-body');
    var leaderboardPodium = document.getElementById('leaderboard-podium');
    var leaderboardDate = document.getElementById('leaderboard-date');
    var leaderboardUpdated = document.getElementById('leaderboard-updated');
    var leaderboardTopCashback = document.getElementById('leaderboard-top-cashback');
    var leaderboardTotalLots = document.getElementById('leaderboard-total-lots');
    var leaderboardClientCount = document.getElementById('leaderboard-client-count');
    var leaderboardDateKey = '';
    var dailyRefreshTimer = null;
    var LEADERBOARD_ROW_COUNT = 10;

    function getLocalDateKey(date){
      var year = date.getFullYear();
      var month = String(date.getMonth() + 1).padStart(2, '0');
      var day = String(date.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    }

    function formatLeaderboardDate(date){
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    function formatLots(number){
      return Number(number).toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
    }

    /* A small deterministic PRNG. The same calendar date produces the same
       ranking all day, then a new ranking is generated after midnight. */
    function hashString(value){
      var hash = 2166136261;
      for(var i = 0; i < value.length; i++){
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    }

    function seededRandom(seed){
      var state = seed >>> 0;
      return function(){
        state += 0x6D2B79F5;
        var t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function randomBetween(random, min, max){
      return min + random() * (max - min);
    }

    function generateDailyLeaderboard(dateKey){
      var random = seededRandom(hashString('PipsLab-' + dateKey));
      var brokers = ['TMGM', 'FPG', 'Vantage'];
      var rows = [];
      var usedIds = {};

      for(var i = 0; i < LEADERBOARD_ROW_COUNT; i++){
        var clientNumber;
        do {
          clientNumber = Math.floor(randomBetween(random, 100000, 999999));
        } while(usedIds[clientNumber]);
        usedIds[clientNumber] = true;

        var lots = Math.round(randomBetween(random, 48, 235) * 10) / 10;
        var rate = 15;
        var cashback = Math.round(lots * rate * 100) / 100;

        rows.push({
          clientId: 'C' + String(clientNumber).slice(0, 2) + '****' + String(clientNumber).slice(-2),
          broker: brokers[Math.floor(random() * brokers.length)],
          lots: lots,
          cashback: cashback
        });
      }

      rows.sort(function(a, b){
        return b.cashback - a.cashback;
      });

      return rows;
    }

    function renderPodium(rows){
      if(!leaderboardPodium) return;
      leaderboardPodium.textContent = '';

      rows.slice(0, 3).forEach(function(row, index){
        var rank = index + 1;
        var card = document.createElement('article');
        card.className = 'podium-card podium-rank-' + rank;

        var top = document.createElement('div');
        top.className = 'podium-topline';

        var rankBadge = document.createElement('span');
        rankBadge.className = 'podium-rank-badge';
        rankBadge.textContent = '#' + rank;

        var rankLabel = document.createElement('span');
        rankLabel.className = 'podium-rank-label';
        rankLabel.textContent = rank === 1 ? 'Top cashback today' : (rank === 2 ? 'Second place' : 'Third place');

        top.appendChild(rankBadge);
        top.appendChild(rankLabel);

        var client = document.createElement('strong');
        client.className = 'podium-client';
        client.textContent = row.clientId;

        var broker = document.createElement('span');
        broker.className = 'podium-broker';
        broker.textContent = row.broker;

        var amount = document.createElement('span');
        amount.className = 'podium-cashback';
        amount.textContent = formatUSD(row.cashback);

        var lots = document.createElement('span');
        lots.className = 'podium-lots';
        lots.textContent = formatLots(row.lots) + ' lots today';

        card.appendChild(top);
        card.appendChild(client);
        card.appendChild(broker);
        card.appendChild(amount);
        card.appendChild(lots);
        leaderboardPodium.appendChild(card);
      });
    }

    function renderLeaderboard(rows){
      if(!leaderboardBody) return;
      var fragment = document.createDocumentFragment();

      rows.forEach(function(row, index){
        var rank = index + 1;
        var tr = document.createElement('tr');
        if(rank <= 3) tr.className = 'top-rank-row top-rank-' + rank;

        var rankCell = document.createElement('td');
        rankCell.className = 'rank';
        var rankBadge = document.createElement('span');
        rankBadge.className = 'table-rank-badge';
        rankBadge.textContent = '#' + rank;
        rankCell.appendChild(rankBadge);

        var clientCell = document.createElement('td');
        clientCell.className = 'client-id';
        clientCell.textContent = row.clientId;

        var brokerCell = document.createElement('td');
        brokerCell.className = 'broker-cell';
        var brokerPill = document.createElement('span');
        brokerPill.className = 'broker-pill';
        brokerPill.textContent = row.broker;
        brokerCell.appendChild(brokerPill);

        var lotsCell = document.createElement('td');
        lotsCell.className = 'lots';
        lotsCell.textContent = formatLots(row.lots);

        var cashbackCell = document.createElement('td');
        cashbackCell.className = 'cashback';
        cashbackCell.textContent = formatUSD(row.cashback);

        tr.appendChild(rankCell);
        tr.appendChild(clientCell);
        tr.appendChild(brokerCell);
        tr.appendChild(lotsCell);
        tr.appendChild(cashbackCell);
        fragment.appendChild(tr);
      });

      leaderboardBody.textContent = '';
      leaderboardBody.appendChild(fragment);
      renderPodium(rows);

      var totalLots = rows.reduce(function(total, row){ return total + row.lots; }, 0);

      if(leaderboardTopCashback) leaderboardTopCashback.textContent = rows.length ? formatUSD(rows[0].cashback) : '—';
      if(leaderboardTotalLots) leaderboardTotalLots.textContent = rows.length ? formatLots(totalLots) : '—';
      if(leaderboardClientCount) leaderboardClientCount.textContent = String(rows.length);
    }

    function loadLeaderboard(){
      if(!leaderboardBody) return;

      var now = new Date();
      leaderboardDateKey = getLocalDateKey(now);
      var rows = generateDailyLeaderboard(leaderboardDateKey);

      if(leaderboardDate) leaderboardDate.textContent = formatLeaderboardDate(now);
      if(leaderboardUpdated){
        leaderboardUpdated.textContent = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }

      renderLeaderboard(rows);
    }

    function scheduleDailyLeaderboardRefresh(){
      if(dailyRefreshTimer) clearTimeout(dailyRefreshTimer);

      var now = new Date();
      var nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2, 0);
      var delay = Math.max(1000, nextDay.getTime() - now.getTime());

      dailyRefreshTimer = setTimeout(function(){
        loadLeaderboard();
        scheduleDailyLeaderboardRefresh();
      }, delay);
    }

    if(leaderboardBody){
      loadLeaderboard();
      scheduleDailyLeaderboardRefresh();

      document.addEventListener('visibilitychange', function(){
        if(!document.hidden){
          var currentDateKey = getLocalDateKey(new Date());
          if(currentDateKey !== leaderboardDateKey){
            loadLeaderboard();
            scheduleDailyLeaderboardRefresh();
          }
        }
      });
    }

    /* ---------- Footer year ---------- */
    var footerYear = document.getElementById('footer-year');
    if(footerYear){
      footerYear.textContent = new Date().getFullYear();
    }

    /* ---------- Broker ticker ---------- */
    var track = document.getElementById('ticker-track');
    if(track){
      track.innerHTML += track.innerHTML;
    }

    /* ---------- Broker filter tabs ---------- */
    var filterTabs = document.querySelectorAll('.filter-tab[data-filter]');
    var brokerCards = document.querySelectorAll('.broker-card');

    filterTabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        filterTabs.forEach(function(otherTab){
          otherTab.classList.remove('active');
          otherTab.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        var filter = tab.getAttribute('data-filter');
        brokerCards.forEach(function(card){
          card.classList.toggle('hidden',
            filter !== 'all' && card.getAttribute('data-category') !== filter);
        });
      });
    });

    /* ---------- Copy referral code ---------- */
    document.querySelectorAll('[data-copy]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var code = btn.getAttribute('data-copy');
        var original = btn.textContent;
        btn.disabled = true;

        function feedback(message){
          btn.textContent = message;
          setTimeout(function(){
            btn.textContent = original;
            btn.disabled = false;
          }, 2000);
        }

        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(code).then(function(){
            feedback('Copied');
          }).catch(function(){
            feedback('Please copy manually');
          });
        } else {
          feedback('Please copy manually');
        }
      });
    });

    /* ---------- FAQ accordion ---------- */
    document.querySelectorAll('.faq-item').forEach(function(item){
      var question = item.querySelector('.faq-q');
      var answer = item.querySelector('.faq-a');
      var panel = item.closest('.faq-panel');
      if(!question || !answer || !panel) return;

      question.addEventListener('click', function(){
        var isOpen = item.classList.contains('open');

        panel.querySelectorAll('.faq-item.open').forEach(function(openItem){
          if(openItem !== item){
            openItem.classList.remove('open');
            openItem.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
            openItem.querySelector('.faq-a').style.maxHeight = null;
          }
        });

        item.classList.toggle('open', !isOpen);
        question.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        answer.style.maxHeight = isOpen ? null : answer.scrollHeight + 'px';
      });
    });

    function resizeOpenAnswers(){
      document.querySelectorAll('.faq-panel.active .faq-item.open .faq-a').forEach(function(answer){
        answer.style.maxHeight = answer.scrollHeight + 'px';
      });
    }
    window.addEventListener('resize', resizeOpenAnswers);

    /* ---------- FAQ category tabs ---------- */
    var faqTabs = document.querySelectorAll('.filter-tab[data-faq-tab]');
    var faqPanels = document.querySelectorAll('.faq-panel');

    faqTabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        faqTabs.forEach(function(otherTab){
          otherTab.classList.remove('active');
          otherTab.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        var target = tab.getAttribute('data-faq-tab');
        faqPanels.forEach(function(panel){
          panel.classList.toggle('active', panel.getAttribute('data-faq-panel') === target);
        });
        resizeOpenAnswers();
      });
    });

    /* ---------- Cinematic scroll reveals and hero parallax ---------- */
    var motionTargets = document.querySelectorAll(
      '.section-head,.ledger-row,.broker-card,.resource-card,.event-card,.about-col,.timeline-row,.benefit-row,.faq-layout,.leaderboard-wrap,.leaderboard-summary,.leaderboard-podium,.cta-band-inner'
    );
    if(motionTargets.length){
      document.body.classList.add('motion-ready');
      if('IntersectionObserver' in window){
        var revealObserver = new IntersectionObserver(function(entries, observer){
          entries.forEach(function(entry){
            if(entry.isIntersecting){
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        }, { threshold:0.12, rootMargin:'0px 0px -35px 0px' });
        motionTargets.forEach(function(target){ revealObserver.observe(target); });
      } else {
        motionTargets.forEach(function(target){ target.classList.add('is-visible'); });
      }
    }

    var coinStage = document.querySelector('[data-coin-stage]');
    var heroVisual = document.querySelector('.hero-visual');
    if(coinStage && heroVisual && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      var pointerFrame = null;
      var pointerX = 0;
      var pointerY = 0;
      heroVisual.addEventListener('pointermove', function(event){
        var rect = heroVisual.getBoundingClientRect();
        pointerX = (event.clientX - rect.left) / rect.width - .5;
        pointerY = (event.clientY - rect.top) / rect.height - .5;
        if(!pointerFrame){
          pointerFrame = requestAnimationFrame(function(){
            coinStage.style.setProperty('--coin-ry', (pointerX * 12).toFixed(2) + 'deg');
            coinStage.style.setProperty('--coin-rx', (pointerY * -10).toFixed(2) + 'deg');
            coinStage.style.setProperty('--coin-x', (pointerX * 13).toFixed(1) + 'px');
            coinStage.style.setProperty('--coin-y', (pointerY * 10).toFixed(1) + 'px');
            pointerFrame = null;
          });
        }
      });
      heroVisual.addEventListener('pointerleave', function(){
        coinStage.style.setProperty('--coin-ry','0deg');
        coinStage.style.setProperty('--coin-rx','0deg');
        coinStage.style.setProperty('--coin-x','0px');
        coinStage.style.setProperty('--coin-y','0px');
      });
    }

    /* ---------- Scroll progress, header state and section spy ---------- */
    var header = document.querySelector('.site-header');
    var progress = document.createElement('div');
    progress.className = 'scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);

    var scrollFrame = null;
    function updateScrollUI(){
      var scrollable = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, ratio)) + ')';
      if(header) header.classList.toggle('scrolled', window.scrollY > 18);
      scrollFrame = null;
    }
    window.addEventListener('scroll', function(){
      if(!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollUI);
    }, { passive:true });
    updateScrollUI();

    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.main-nav a[href^="#"]'));
    var navSections = navLinks.map(function(link){
      return { link:link, section:document.querySelector(link.getAttribute('href')) };
    }).filter(function(item){ return item.section; });
    if('IntersectionObserver' in window && navSections.length){
      var spy = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            navSections.forEach(function(item){ item.link.classList.toggle('is-active', item.section === entry.target); });
          }
        });
      }, { rootMargin:'-35% 0px -55% 0px', threshold:0 });
      navSections.forEach(function(item){ spy.observe(item.section); });
    }

    /* ---------- Gentle 3D card response ---------- */
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      document.querySelectorAll('.broker-card,.resource-card,.podium-card').forEach(function(card){
        var cardFrame = null;
        card.addEventListener('pointermove', function(event){
          var rect = card.getBoundingClientRect();
          var x = (event.clientX - rect.left) / rect.width - .5;
          var y = (event.clientY - rect.top) / rect.height - .5;
          card.style.setProperty('--mouse-x', ((x + .5) * 100).toFixed(1) + '%');
          card.style.setProperty('--mouse-y', ((y + .5) * 100).toFixed(1) + '%');
          card.classList.add('is-hovered');
          if(cardFrame) cancelAnimationFrame(cardFrame);
          cardFrame = requestAnimationFrame(function(){
            card.style.transform = 'perspective(900px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg) translateY(-8px)';
          });
        });
        card.addEventListener('pointerleave', function(){
          if(cardFrame) cancelAnimationFrame(cardFrame);
          card.style.transform = '';
          card.style.setProperty('--mouse-x', '50%');
          card.style.setProperty('--mouse-y', '0%');
          card.classList.remove('is-hovered');
        });
      });
    }

    /* ---------- Contact button ripple ---------- */
    document.querySelectorAll('.broker-card .btn').forEach(function(button){
      button.addEventListener('click', function(event){
        var rect = button.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = 'btn-ripple';
        ripple.style.left = (event.clientX - rect.left) + 'px';
        ripple.style.top = (event.clientY - rect.top) + 'px';
        button.appendChild(ripple);
        setTimeout(function(){ ripple.remove(); }, 700);
      });
    });

  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
