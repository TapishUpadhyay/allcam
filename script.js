(function () {
  "use strict";
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast");
  var menuBtn = document.getElementById("menuBtn");
  var nav = document.getElementById("mainNav");
  var data = null;
  var toastTimer;

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }

  function toast(msg, bad) {
    toastEl.textContent = msg;
    toastEl.className = "toast show" + (bad ? " bad" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.className = "toast"; }, 3200);
  }

  function imgUrl(file) {
    return "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file) + "?width=800";
  }
  function pageUrl(file) {
    return "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(file.replace(/ /g, "_"));
  }

  function buildPrompt(c) {
    return "Take the photo I attach and create a new image that looks exactly like it was photographed with the " + c.name + " (" + c.year + "). " +
      "Format: " + c.format + ". " +
      "Look: " + c.look + ". " +
      "Keep my subject, pose and composition the same. Only change how the picture looks, as if this camera had taken it. Give me the final image only.";
  }

  function photo(file, alt, caption) {
    var fig = el("figure");
    var img = el("img", { src: imgUrl(file), alt: alt, loading: "lazy", width: "800" });
    img.addEventListener("error", function () {
      fig.innerHTML = "";
      var box = el("div", { class: "error" }, [
        el("h2", { text: "Image could not load" }),
        el("p", { text: "Check your connection, then reload. You can also open the picture on Wikimedia Commons." }),
        el("a", { href: pageUrl(file), target: "_blank", rel: "noopener", text: "Open on Wikimedia Commons" })
      ]);
      fig.appendChild(box);
    });
    fig.appendChild(img);
    fig.appendChild(el("figcaption", {}, [
      document.createTextNode(caption + " "),
      el("a", { href: pageUrl(file), target: "_blank", rel: "noopener", text: "Credit: Wikimedia Commons" })
    ]));
    return fig;
  }

  function setEra(era) { document.documentElement.setAttribute("data-era", era || "film"); }

  function viewHome(query) {
    setEra("film");
    var frag = document.createDocumentFragment();
    var hero = el("section", { class: "hero" }, [
      el("h1", { text: "Ten cameras, one thousand years of pictures." }),
      el("p", { text: "Open a camera to read its story, see how its photos look, and copy a prompt that gives your own photo that camera's look." })
    ]);
    var search = el("input", { class: "search", type: "search", placeholder: "Search by name or year", "aria-label": "Search cameras", value: query || "" });
    hero.appendChild(search);
    frag.appendChild(hero);
    var list = el("ul", { class: "timeline" });
    frag.appendChild(list);

    function renderList(q) {
      list.innerHTML = "";
      var term = (q || "").trim().toLowerCase();
      var found = data.cameras.filter(function (c) {
        return !term || (c.name + " " + c.year + " " + c.tagline).toLowerCase().indexOf(term) !== -1;
      });
      if (!found.length) {
        list.appendChild(el("li", {}, [el("div", { class: "empty" }, [
          el("h2", { text: "No cameras match \"" + q + "\"" }),
          el("p", { text: "Try a shorter word like \"Kodak\" or a year like \"1959\". More cameras are on the way." })
        ])]));
        return;
      }
      found.forEach(function (c) {
        var a = el("a", { class: "row", href: "#/camera/" + c.id, "data-era": c.era }, [
          el("span", { class: "yr", text: c.year }),
          el("div", {}, [el("h2", { text: c.name }), el("p", { text: c.tagline })]),
          el("img", { src: imgUrl(c.cameraImage), alt: c.name, loading: "lazy", width: "300", height: "96" })
        ]);
        a.querySelector("img").addEventListener("error", function (e) { e.target.style.visibility = "hidden"; });
        list.appendChild(el("li", {}, [a]));
      });
    }
    renderList(query);
    search.addEventListener("input", function () { renderList(search.value); });
    return frag;
  }

  function viewCamera(id) {
    var idx = data.cameras.findIndex(function (c) { return c.id === id; });
    if (idx < 0) return viewNotFound();
    var c = data.cameras[idx];
    setEra(c.era);
    var frag = document.createDocumentFragment();
    frag.appendChild(el("a", { class: "back", href: "#/", text: "Back to all cameras" }));

    var facts = el("dl", { class: "facts" });
    c.facts.forEach(function (f) {
      facts.appendChild(el("dt", { text: f[0] }));
      facts.appendChild(el("dd", { text: f[1] }));
    });
    var text = el("div", {}, [
      el("div", { class: "year", text: c.year }),
      el("h1", { text: c.name }),
      el("p", { class: "tagline", text: c.tagline }),
      facts
    ]);
    frag.appendChild(el("div", { class: "detail-top" }, [text]));

    var cam = photo(c.cameraImage, c.name, "The camera.");
    cam.className = "cam-fig";
    var sample;
    if (c.sampleImage) {
      sample = photo(c.sampleImage, "A photograph made with " + c.name, "How a photo from this camera looks.");
    } else {
      var q = encodeURIComponent("photograph taken with " + c.name);
      sample = el("div", { class: "empty" }, [
        el("h2", { text: "No sample photo added yet" }),
        el("p", { text: "Find a free-licensed example on Wikimedia Commons, then add its file name to cameras.json." }),
        el("a", { href: "https://commons.wikimedia.org/w/index.php?search=" + q + "&ns6=1", target: "_blank", rel: "noopener", text: "Search Wikimedia Commons" })
      ]);
    }
    sample.classList.add("sample-fig");
    frag.appendChild(el("div", { class: "visuals" }, [cam, sample]));

    frag.appendChild(el("section", { class: "block story" }, [el("h2", { text: "The story" }), el("p", { text: c.story })]));

    var prompt = buildPrompt(c);
    var pre = el("pre", { text: prompt });
    var copy = el("button", { class: "btn", type: "button", text: "Copy prompt" });
    copy.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(prompt).then(
          function () { toast("Prompt copied."); },
          function () { toast("Could not copy. Select the text and copy it by hand.", true); }
        );
      } else { toast("Copy is not available here. Select the text and copy it by hand.", true); }
    });
    var open = el("a", {
      class: "btn primary", target: "_blank", rel: "noopener",
      href: "https://claude.ai/new?q=" + encodeURIComponent(prompt),
      text: "Make it in Claude"
    });
    open.addEventListener("click", function () { toast("Opening Claude with your prompt. Attach your photo there."); });
    frag.appendChild(el("section", { class: "block" }, [
      el("h2", { text: "Turn your photo into a " + c.name + " photo" }),
      el("div", { class: "prompt-box" }, [pre, el("div", { class: "actions" }, [copy, open])])
    ]));

    var pager = el("div", { class: "pager" });
    if (idx > 0) pager.appendChild(el("a", { class: "btn", href: "#/camera/" + data.cameras[idx - 1].id, text: "Older: " + data.cameras[idx - 1].name }));
    else pager.appendChild(el("span"));
    if (idx < data.cameras.length - 1) pager.appendChild(el("a", { class: "btn", href: "#/camera/" + data.cameras[idx + 1].id, text: "Newer: " + data.cameras[idx + 1].name }));
    frag.appendChild(pager);
    return frag;
  }

  function viewUpcoming() {
    setEra("film");
    var ul = el("ul", { class: "list-plain" });
    data.upcoming.forEach(function (n) { ul.appendChild(el("li", { text: n })); });
    return el("div", {}, [
      el("h1", { text: "Coming soon" }),
      el("p", { text: "The master list has 50 cameras. These 40 will be added over time." }),
      ul
    ]);
  }

  function viewAbout() {
    setEra("film");
    return el("div", { class: "story" }, [
      el("h1", { text: "About" }),
      el("p", { text: "Lens Through Time follows the camera from a dark room with a hole in the wall to the phone in your pocket. Each page gives a short story, a picture of the camera, a sample of how its photos look, and a ready-made prompt for Claude." }),
      el("p", { text: "Pictures come from Wikimedia Commons and are credited under each image." })
    ]);
  }

  function viewNotFound() {
    setEra("film");
    return el("div", { class: "empty" }, [
      el("h2", { text: "Page not found" }),
      el("p", { text: "That page does not exist. Go back to the timeline and pick a camera." }),
      el("a", { class: "btn", href: "#/", text: "Back to the timeline" })
    ]);
  }

  function viewLoadError() {
    var retry = el("button", { class: "btn primary", type: "button", text: "Try again" });
    retry.addEventListener("click", load);
    return el("div", { class: "error" }, [
      el("h2", { text: "Camera data could not load" }),
      el("p", { text: "The file cameras.json did not load. If you opened index.html by double-clicking it, start a local server instead (for example: python -m http.server) and open the address it prints." }),
      retry
    ]);
  }

  function render() {
    nav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    app.innerHTML = "";
    if (!data) { app.appendChild(viewLoadError()); return; }
    var hash = location.hash.replace(/^#\/?/, "");
    var parts = hash.split("/");
    var view;
    if (!hash) view = viewHome();
    else if (parts[0] === "camera" && parts[1]) view = viewCamera(parts[1]);
    else if (parts[0] === "upcoming") view = viewUpcoming();
    else if (parts[0] === "about") view = viewAbout();
    else view = viewNotFound();
    app.appendChild(view);
    window.scrollTo(0, 0);
  }

  function renderFooter() {
    var f = document.getElementById("footer");
    f.innerHTML = "";
    var s = (data && data.site) || {};
    var links = [];
    if (s.email) links.push(el("a", { href: "mailto:" + s.email, text: s.email }));
    if (s.phone) links.push(el("a", { href: "tel:" + s.phone.replace(/[^+\d]/g, ""), text: s.phone }));
    if (s.github) links.push(el("a", { href: s.github, target: "_blank", rel: "noopener", text: "GitHub" }));
    if (s.portfolio) links.push(el("a", { href: s.portfolio, target: "_blank", rel: "noopener", text: "Portfolio" }));
    f.appendChild(el("p", { text: "Images from Wikimedia Commons, credited on each camera page." }));
    var p = el("p");
    links.forEach(function (l) { p.appendChild(l); });
    f.appendChild(p);
  }

  function load() {
    fetch("cameras.json").then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (j) {
      data = j; renderFooter(); render();
    }).catch(function () {
      data = null; render();
      toast("Could not load camera data.", true);
    });
  }

  menuBtn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  window.addEventListener("hashchange", render);
  load();
})();
