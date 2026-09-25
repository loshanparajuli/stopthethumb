"use client";

import { useEffect } from "react";

export default function InteractiveScript() {
  useEffect(() => {
    var reduce = false;
    try {
      reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {}
    function $(id) {
      return document.getElementById(id);
    }
    function esc(s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    }
    function each(list, fn) {
      Array.prototype.forEach.call(list, fn);
    }

    /* The Thumb, an original mascot drawn in SVG */
    function thumbSVG(mood) {
      var body =
        '<rect x="22" y="8" width="56" height="108" rx="28" class="tb"/>' +
        '<rect x="31" y="15" width="38" height="33" rx="15" class="tn"/>' +
        '<path d="M36 100q14 7 28 0" class="tc"/>';
      var f;
      switch (mood) {
        case "shock":
          f =
            '<circle cx="40" cy="64" r="7.5" class="te"/><circle cx="60" cy="64" r="7.5" class="te"/>' +
            '<circle cx="40" cy="65" r="3.2" class="tp"/><circle cx="60" cy="65" r="3.2" class="tp"/>' +
            '<ellipse cx="50" cy="86" rx="5.5" ry="7" class="tp"/>';
          break;
        case "happy":
          f =
            '<path d="M34 66q6-8 12 0M54 66q6-8 12 0" class="tf"/><path d="M39 80q11 11 22 0" class="tf"/>';
          break;
        case "cool":
          f =
            '<rect x="31" y="58" width="17" height="11" rx="4" class="tp"/><rect x="52" y="58" width="17" height="11" rx="4" class="tp"/>' +
            '<path d="M48 62h4" class="tf"/><path d="M41 82q9 7 18 0" class="tf"/>';
          break;
        case "sad":
          f =
            '<circle cx="41" cy="65" r="3.4" class="tp"/><circle cx="59" cy="65" r="3.4" class="tp"/><path d="M40 89q10-9 20 0" class="tf"/>';
          break;
        case "swipe":
          f =
            '<path d="M35 65h10M55 65h10" class="tf"/><path d="M42 83h16" class="tf"/>' +
            '<path d="M8 30v26M14 20v40M3 44v14" class="tm"/>';
          break;
        default:
          f =
            '<path d="M35 65h10M55 65h10" class="tf"/><path d="M42 83h16" class="tf"/>';
      }
      return (
        '<svg viewBox="0 0 100 124" aria-hidden="true" focusable="false">' +
        body +
        f +
        "</svg>"
      );
    }
    function setThumb(el, mood) {
      if (!el) return;
      el.setAttribute("data-thumb", mood);
      el.innerHTML = thumbSVG(mood);
    }
    function renderThumbs() {
      each(document.querySelectorAll("[data-thumb]"), function (el) {
        el.innerHTML = thumbSVG(el.getAttribute("data-thumb"));
      });
    }

    /* Coin piles for the money meme */
    function coins() {
      each(document.querySelectorAll(".coinstack"), function (el) {
        var piles = (el.getAttribute("data-piles") || "1")
          .split(",")
          .map(Number);
        var w = 120,
          h = 96,
          pw = 32,
          gap = 6,
          s = "";
        var total = piles.length * pw + (piles.length - 1) * gap,
          x0 = (w - total) / 2;
        piles.forEach(function (n, i) {
          var x = x0 + i * (pw + gap);
          for (var k = 0; k < n; k++) {
            var y = h - 10 - k * 7;
            s +=
              '<rect x="' +
              x +
              '" y="' +
              (y - 1) +
              '" width="' +
              pw +
              '" height="7" rx="3" fill="#E3B23C" stroke="#8A6A00" stroke-width="1.2"/>';
            s +=
              '<ellipse cx="' +
              (x + pw / 2) +
              '" cy="' +
              (y - 1) +
              '" rx="' +
              pw / 2 +
              '" ry="4" fill="#FFD35A" stroke="#8A6A00" stroke-width="1.2"/>';
          }
        });
        el.innerHTML =
          '<svg viewBox="0 0 ' +
          w +
          " " +
          h +
          '" style="width:120px;height:96px">' +
          s +
          "</svg>";
      });
    }

    /* Hero: three openers, one thumb */
    function hero() {
      var feed = $("heroFeed"),
        th = $("hthumb");
      if (!feed || !th) return;
      var shorts = feed.querySelectorAll(".short"),
        timers = [];
      function at(ms, fn) {
        timers.push(setTimeout(fn, ms));
      }
      function stamp(i, on) {
        var st = shorts[i].querySelector(".stamp");
        if (st) st.classList.toggle("show", on);
      }
      function reset() {
        timers.forEach(clearTimeout);
        timers = [];
        each(shorts, function (s, i) {
          s.classList.remove("gone");
          s.classList.toggle("wait", i > 0);
          stamp(i, false);
        });
        th.classList.remove("up", "flick");
        setThumb(th, "bored");
      }
      function finalState() {
        each(shorts, function (s, i) {
          s.classList.remove("wait");
          s.classList.toggle("gone", i < 2);
          stamp(i, i === 2);
        });
        setThumb(th, "shock");
        th.classList.add("up");
      }
      function play() {
        reset();
        if (reduce) {
          finalState();
          return;
        }
        at(700, function () {
          th.classList.add("up");
        });
        at(1300, function () {
          stamp(0, true);
        });
        at(1700, function () {
          th.classList.add("flick");
          shorts[0].classList.add("gone");
          shorts[1].classList.remove("wait");
        });
        at(2150, function () {
          th.classList.remove("up", "flick");
        });
        at(2850, function () {
          th.classList.add("up");
        });
        at(3450, function () {
          stamp(1, true);
        });
        at(3850, function () {
          th.classList.add("flick");
          shorts[1].classList.add("gone");
          shorts[2].classList.remove("wait");
        });
        at(4300, function () {
          th.classList.remove("up", "flick");
        });
        at(5000, function () {
          setThumb(th, "shock");
          th.classList.add("up");
        });
        at(5400, function () {
          stamp(2, true);
        });
      }
      var btn = $("replay");
      if (btn) btn.addEventListener("click", play);
      play();
    }

    /* Reading progress bar */
    function progress() {
      var bar = $("progress");
      if (!bar) return;
      var ticking = false;
      function upd() {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
        bar.style.transform = "scaleX(" + p + ")";
        ticking = false;
      }
      window.addEventListener(
        "scroll",
        function () {
          if (!ticking) {
            ticking = true;
            requestAnimationFrame(upd);
          }
        },
        { passive: true }
      );
      upd();
    }

    /* Chapter chips follow your scroll */
    function chips() {
      var wrap = $("chips");
      if (!wrap || !("IntersectionObserver" in window)) return;
      var links = {},
        current = null;
      each(wrap.querySelectorAll(".chip"), function (a) {
        links[a.getAttribute("href").slice(1)] = a;
      });
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            var a = links[e.target.id];
            if (!a || a === current) return;
            if (current) current.classList.remove("on");
            a.classList.add("on");
            current = a;
            var ar = a.getBoundingClientRect(),
              wr = wrap.getBoundingClientRect();
            var left =
              wrap.scrollLeft +
              (ar.left - wr.left) -
              wrap.clientWidth / 2 +
              ar.width / 2;
            try {
              wrap.scrollTo({ left: left, behavior: reduce ? "auto" : "smooth" });
            } catch (err) {
              wrap.scrollLeft = left;
            }
          });
        },
        { rootMargin: "-35% 0px -60% 0px" }
      );
      each(document.querySelectorAll("section.ch"), function (s) {
        io.observe(s);
      });
    }

    /* Viewed vs swiped away gauge */
    function gauge() {
      var z = $("gZones"),
        n = $("gNeedle"),
        inp = $("gIn"),
        rd = $("gRead"),
        msg = $("gMsg");
      if (!z || !n || !inp) return;
      var cx = 150,
        cy = 150,
        r = 112;
      function pt(v, rr) {
        var a = Math.PI + (v / 100) * Math.PI;
        return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
      }
      function arc(v0, v1, cls, op) {
        // The whole gauge is a half circle, so 100 points span 180 degrees and
        // no segment can ever be the large arc.
        var p0 = pt(v0, r),
          p1 = pt(v1, r),
          large = 0;
        return (
          '<path d="M' +
          p0[0].toFixed(1) +
          " " +
          p0[1].toFixed(1) +
          " A" +
          r +
          " " +
          r +
          " 0 " +
          large +
          " 1 " +
          p1[0].toFixed(1) +
          " " +
          p1[1].toFixed(1) +
          '" fill="none" stroke-width="22" class="' +
          cls +
          '"' +
          (op ? ' opacity="' + op + '"' : "") +
          "/>"
        );
      }
      function label(v, t) {
        var p = pt(v, 136);
        return (
          '<text x="' +
          p[0].toFixed(1) +
          '" y="' +
          (p[1] + 4).toFixed(1) +
          '" text-anchor="middle" font-size="12" class="svgt">' +
          t +
          "</text>"
        );
      }
      z.innerHTML =
        arc(0, 60, "k-swipe") +
        arc(60, 70, "k-amber") +
        arc(70, 90, "k-stay") +
        arc(90, 100, "k-stay", "0.5") +
        label(60, "60") +
        label(70, "70") +
        label(90, "90");
      function upd() {
        var v = +inp.value;
        rd.textContent = v + "%";
        n.setAttribute(
          "transform",
          "rotate(" + (v - 50) * 1.8 + " " + cx + " " + cy + ")"
        );
        var m;
        if (v < 60)
          m =
            "Under 60 percent: in the 3.3-billion-view study, Shorts down here did poorly. Fix frame one and your first line.";
        else if (v < 70)
          m =
            "The gray zone. Try a sharper first line and get the receipt on screen sooner.";
        else if (v <= 90)
          m =
            "70 to 90 percent: where Shorts did better in the study. Now check whether people stay to the end.";
        else
          m =
            "Rare air. A great number here still doesn't promise a hit, so check retention and follows too.";
        msg.textContent = m;
        rd.style.color =
          v < 60 ? "var(--swipe)" : v < 70 ? "var(--amber)" : "var(--stay)";
      }
      inp.addEventListener("input", upd);
      upd();
    }

    /* Hook slot machine, fed by the hook bank on the page */
    function slot() {
      var btn = $("spin"),
        out = $("slotOut");
      if (!btn || !out) return;
      var pats = Array.prototype.map.call(
        document.querySelectorAll("#bankList .pat"),
        function (p) {
          var pills = p.querySelectorAll(".pill");
          return {
            name: p.querySelector("h4").textContent.replace(/^\d+\.\s*/, ""),
            emotion: pills[0] ? pills[0].textContent : "",
            lane: p.getAttribute("data-lane"),
            tpl: p.querySelector(".tpl").textContent,
            eg: p.querySelector(".eg").textContent,
            why: p.querySelector(".why").textContent,
          };
        }
      );
      if (!pats.length) return;
      var reels = [$("reel1"), $("reel2"), $("reel3")],
        labels = ["Pattern", "Emotion", "Lane"],
        last = -1,
        busy = false;
      function setReel(i, t) {
        reels[i].innerHTML =
          "<span><small>" + labels[i] + "</small><b>" + esc(t) + "</b></span>";
      }
      btn.addEventListener("click", function () {
        if (busy) return;
        busy = true;
        var pick;
        do {
          pick = Math.floor(Math.random() * pats.length);
        } while (pats.length > 1 && pick === last);
        last = pick;
        var p = pats[pick];
        function finish() {
          reels.forEach(function (el) {
            el.classList.remove("spin");
          });
          setReel(0, p.name);
          setReel(1, p.emotion);
          setReel(2, p.lane);
          out.innerHTML =
            '<p class="small muted" style="margin:0">Fill-in template</p><p class="tpl">' +
            esc(p.tpl) +
            "</p>" +
            '<p class="small muted" style="margin:0">Example for your niche</p><p style="font:750 1.02rem/1.35 var(--f-display);margin:4px 0 8px">' +
            esc(p.eg) +
            "</p>" +
            '<p class="small muted" style="margin:0">' +
            esc(p.why) +
            "</p>";
          busy = false;
        }
        if (reduce) {
          finish();
          return;
        }
        reels.forEach(function (el) {
          el.classList.add("spin");
        });
        var ticks = 0;
        var iv = setInterval(function () {
          ticks++;
          var q = pats[Math.floor(Math.random() * pats.length)];
          setReel(0, q.name);
          setReel(1, q.emotion);
          setReel(2, q.lane);
          if (ticks >= 12) {
            clearInterval(iv);
            finish();
          }
        }, 70);
      });
    }

    /* Swipe or stay quiz */
    var QUIZ = [
      {
        t: "Hey guys, welcome back to the channel!",
        a: "swipe",
        w: "A hello is not a reason to stay. Nobody swiped in to be greeted.",
      },
      {
        t: "Instagram had 13 employees when Facebook paid $1 billion for it.",
        a: "stay",
        w: "A real number that sounds impossible, with a receipt you can put on screen at frame one.",
      },
      {
        t: "So basically, I want to talk about startups today.",
        a: "swipe",
        w: "A slow story start. In the 4,000-video study these averaged about 7,000 views, roughly 20 times worse than hot takes.",
      },
      {
        t: "It took me three nights to edit one podcast episode, so I'm building an app that does it in about twenty minutes.",
        a: "stay",
        w: "Pain, a number and a result in one sentence. The timer on screen is the receipt.",
      },
      {
        t: "Did you know startups can fail?",
        a: "swipe",
        w: "Everyone already knows. Nobody would bet against it, so there is no reason to stay.",
      },
      {
        t: "Blockbuster could have bought Netflix for $50 million, and it said no.",
        a: "stay",
        w: "Everyone knows how this story ends, which makes the mistake feel huge. They stay to see how it happened.",
      },
      {
        t: "Wait for it...",
        a: "swipe",
        w: "You are asking for patience in the one place nobody has any.",
      },
      {
        t: "Quibi raised $1.75 billion and shut down about six months after launch.",
        a: "stay",
        w: "Fear of losing money was the strongest emotion in the data, and the number is its own receipt.",
      },
      {
        t: "In this video, I'll explain how venture capital works.",
        a: "swipe",
        w: "It names a subject instead of a surprise. There is no claim to bet against and no crack.",
      },
      {
        t: "OpenAI's board fired Sam Altman on a Friday, and within five days they agreed to bring him back.",
        a: "stay",
        w: "Stakes, a clock and an obvious question: how did that happen so fast?",
      },
    ];
    function quiz() {
      var txt = $("qText");
      if (!txt) return;
      var who = $("qWho"),
        cnt = $("qCount"),
        btns = $("qBtns"),
        ver = $("qVerdict"),
        vh = $("qVHead"),
        why = $("qWhy"),
        next = $("qNext"),
        end = $("qEnd"),
        fin = $("qFinal"),
        finMsg = $("qFinalMsg"),
        rst = $("qRestart"),
        th = $("qThumb");
      var i = 0,
        score = 0,
        answered = false;
      function count() {
        cnt.textContent =
          "Opener " + (i + 1) + " of " + QUIZ.length + ". Score: " + score;
      }
      function show() {
        answered = false;
        txt.textContent = QUIZ[i].t;
        who.textContent = "Opener " + (i + 1);
        count();
        ver.className = "verdict";
        btns.style.display = "flex";
        end.classList.remove("show");
      }
      function answer(choice) {
        if (answered) return;
        answered = true;
        var ok = choice === QUIZ[i].a;
        if (ok) score++;
        vh.textContent =
          (ok ? "Right. " : "Not quite. ") + "The thumb says " + QUIZ[i].a + ".";
        why.textContent = QUIZ[i].w;
        ver.className = "verdict show " + (ok ? "ok" : "no");
        btns.style.display = "none";
        count();
        next.textContent = i === QUIZ.length - 1 ? "See my score" : "Next opener";
        try {
          next.focus({ preventScroll: true });
        } catch (e) {}
      }
      function finish() {
        ver.className = "verdict";
        btns.style.display = "none";
        fin.textContent = score + " out of " + QUIZ.length;
        setThumb(
          th,
          score >= 9 ? "cool" : score >= 7 ? "happy" : score >= 5 ? "bored" : "sad"
        );
        finMsg.textContent =
          score >= 9
            ? "You think like the thumb. Go write 30 hooks."
            : score >= 7
            ? "Solid. Reread the kill list once and you're there."
            : score >= 5
            ? "Halfway there. The Receipt Hook chapter is your friend."
            : "The thumb is disappointed. Start again from chapter 3.";
        end.classList.add("show");
        txt.textContent = "Final score: " + score + " of " + QUIZ.length;
        who.textContent = "";
      }
      $("qSwipe").addEventListener("click", function () {
        answer("swipe");
      });
      $("qStay").addEventListener("click", function () {
        answer("stay");
      });
      next.addEventListener("click", function () {
        if (i < QUIZ.length - 1) {
          i++;
          show();
        } else {
          finish();
        }
      });
      rst.addEventListener("click", function () {
        i = 0;
        score = 0;
        show();
      });
      show();
    }

    /* Hook scorecard */
    function scorecard() {
      var box = $("crits");
      if (!box) return;
      var inputs = box.querySelectorAll("input"),
        num = $("scoreNum"),
        band = $("scoreBand"),
        th = $("scoreThumb");
      function upd() {
        var s = 0;
        each(inputs, function (x) {
          if (x.checked) s += +x.getAttribute("data-w");
        });
        num.textContent = s;
        var b, m;
        if (s >= 80) {
          b = "Ship it.";
          m = "cool";
        } else if (s >= 65) {
          b = "Fix the weakest part, then ship.";
          m = "happy";
        } else if (s >= 50) {
          b = "Rewrite the first line.";
          m = "bored";
        } else {
          b = "Pick a new idea. The topic is the problem.";
          m = s > 0 ? "sad" : "bored";
        }
        band.textContent = b;
        setThumb(th, m);
        num.style.color =
          s >= 80 ? "var(--stay)" : s >= 50 ? "var(--ink)" : "var(--swipe)";
      }
      each(inputs, function (x) {
        x.addEventListener("change", upd);
      });
      $("scoreReset").addEventListener("click", function () {
        each(inputs, function (x) {
          x.checked = false;
        });
        upd();
      });
      upd();
    }

    /* 30-day checklist, saved in this browser */
    function sprint() {
      var list = $("sprintList");
      if (!list) return;
      var KEY = "stopthumb-sprint-v1",
        state = {};
      try {
        var raw = window.localStorage.getItem(KEY);
        if (raw) state = JSON.parse(raw) || {};
      } catch (e) {
        state = {};
      }
      var boxes = list.querySelectorAll('input[type="checkbox"]');
      function save() {
        try {
          window.localStorage.setItem(KEY, JSON.stringify(state));
        } catch (e) {}
      }
      function upd() {
        var done = 0;
        each(boxes, function (b) {
          var on = !!state[b.getAttribute("data-id")];
          b.checked = on;
          b.closest(".task").classList.toggle("done", on);
          if (on) done++;
        });
        var pct = Math.round((done / boxes.length) * 100);
        $("sprintBar").style.width = pct + "%";
        $("sprintTxt").textContent =
          done +
          " of " +
          boxes.length +
          " done" +
          (done === boxes.length ? ". The thumb is officially stopped." : "");
        setThumb(
          $("sprintThumb"),
          done === boxes.length
            ? "cool"
            : pct >= 60
            ? "shock"
            : pct >= 25
            ? "happy"
            : "bored"
        );
      }
      each(boxes, function (b) {
        b.addEventListener("change", function () {
          state[b.getAttribute("data-id")] = b.checked;
          save();
          upd();
        });
      });
      $("sprintReset").addEventListener("click", function () {
        state = {};
        save();
        upd();
      });
      upd();
    }

    /* Copy buttons for the ready hooks */
    function copies() {
      each(document.querySelectorAll(".copy"), function (btn) {
        btn.addEventListener("click", function () {
          var text = btn.getAttribute("data-copy"),
            orig = btn.textContent;
          function done(ok) {
            btn.textContent = ok ? "Copied" : "Select the text to copy";
            setTimeout(function () {
              btn.textContent = orig;
            }, 1600);
          }
          function fallback() {
            try {
              var ta = document.createElement("textarea");
              ta.value = text;
              ta.setAttribute("readonly", "");
              ta.style.position = "fixed";
              ta.style.opacity = "0";
              document.body.appendChild(ta);
              ta.select();
              var ok = document.execCommand("copy");
              document.body.removeChild(ta);
              done(ok);
            } catch (e) {
              done(false);
            }
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
              done(true);
            }, fallback);
          } else {
            fallback();
          }
        });
      });
    }

    /* Fresh finds: absolute dates become "N days ago" for the first 10 days */
    function freshness() {
      var RELATIVE_DAYS = 10;
      var startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      each(document.querySelectorAll(".find-when[data-when]"), function (el) {
        var parts = el.getAttribute("data-when").split("-");
        var found = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        if (isNaN(found.getTime())) return;

        var days = Math.round((startOfToday - found) / 86400000);
        if (days < 0 || days > RELATIVE_DAYS) return;

        var label =
          days === 0
            ? "today"
            : days === 1
            ? "yesterday"
            : days + " days ago";

        var time = el.querySelector("time");
        if (time) time.textContent = label;
        if (days <= 2) el.classList.add("find-new");
      });
    }

    function safe(fn) {
      try {
        fn();
      } catch (e) {
        if (window.console) console.warn(e);
      }
    }
    safe(renderThumbs);
    safe(coins);
    safe(hero);
    safe(progress);
    safe(chips);
    safe(gauge);
    safe(slot);
    safe(quiz);
    safe(scorecard);
    safe(sprint);
    safe(copies);
    safe(freshness);
  }, []);

  return null;
}
