/* Anura · módulo de análisis: marco de la aplicación, mascota viva y gráficos animados. Todo cuelga de `A`. */
(function () {
  "use strict";
  var N = window.NotasDotGrid;
  var A = (window.A = {});
  var QUIETO = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var I = { // trazos de 24 x 24
    distribucion: '<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>',
    centroides: '<circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="1.2"/><circle cx="19" cy="7" r="1.2"/><circle cx="6" cy="18" r="1.2"/><circle cx="18" cy="18" r="1.2"/>',
    precision: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    mejora: '<path d="M12 21s-6-5.6-6-10a6 6 0 1 1 12 0c0 4.4-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>',
    openset: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17h.01"/>',
    acid: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    base: '<path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"/>',
    codigo: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>',
    flecha: '<path d="M5 12h14m0 0l-6-6m6 6l-6 6"/>',
    atras: '<path d="M19 12H5m0 0l6-6m-6 6l6 6"/>',
    tema: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
    externo: '<path d="M7 17L17 7M9 7h8v8"/>',
    abajo: '<path d="M2 4l4 4 4-4"/>'
  };
  function ico(n, caja) { return '<svg viewBox="' + (caja || "0 0 24 24") + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[n] + "</svg>"; }
  A.ico = ico;

  var MODULOS = (A.MODULOS = [
    { id: "distribucion", t: "Distribución", d: "Cómo se reparten las especies" },
    { id: "centroides", t: "Centroides", d: "Cómo ve el modelo a cada especie" },
    { id: "precision", t: "Precisión", d: "Cuánto acierta y dónde falla" },
    { id: "mejora", t: "Mejora", d: "Qué aporta la ubicación" },
    { id: "openset", t: "Open set", d: "Especies que no conoce" }
  ]);

  // --- formato (es-CO: coma decimal, punto de miles)
  A.num = function (v) { return Math.round(v).toLocaleString("es-CO"); };
  A.pct = function (v, d) { return (v * 100).toLocaleString("es-CO", { maximumFractionDigits: d == null ? 1 : d }) + " %"; };
  A.dec = function (v, d) { d = d == null ? 3 : d; return v.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d }); };
  A.sp = function (nombre) { return "<em>" + nombre + "</em>"; };
  var F = { num: A.num, pct: A.pct, pct0: function (v) { return A.pct(v, 0); }, dec2: function (v) { return A.dec(v, 2); } };
  A.datos = function (nombre) {
    return fetch("../data/" + nombre + ".json").then(function (r) {
      if (!r.ok) throw new Error("No se pudo leer data/" + nombre + ".json (" + r.status + ")");
      return r.json();
    });
  };
  function el(sel) { return typeof sel === "string" ? document.querySelector(sel) : sel; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
  function texto(html) { return String(html).replace(/<[^>]+>/g, ""); }
  function reinicia(nodo, clase) { nodo.classList.remove(clase); void nodo.offsetWidth; nodo.classList.add(clase); }

  // --- números que suben hasta su valor: <b data-n="0.57" data-f="pct0">
  function sube(nodo, hasta, fmt) {
    if (QUIETO) { nodo.textContent = fmt(hasta); return; }
    var t0 = performance.now(), desde = nodo._valor || 0;
    nodo._valor = hasta;
    (function paso(t) {
      var k = Math.min(1, (t - t0) / 800), s = 1 - Math.pow(1 - k, 3);
      nodo.textContent = fmt(desde + (hasta - desde) * s);
      if (k < 1) requestAnimationFrame(paso);
    })(t0);
  }
  A.sube = sube;
  A.cuenta = function (raiz) {
    [].forEach.call(el(raiz).querySelectorAll("[data-n]"), function (n) { n._valor = 0; sube(n, +n.getAttribute("data-n"), F[n.getAttribute("data-f") || "num"]); });
  };
  A.cifras = function (lista) { // [[valor, formato, etiqueta]]
    return '<div class="cifras">' + lista.map(function (c) { return '<div class="cifra"><b data-n="' + c[0] + '" data-f="' + c[1] + '">' + F[c[1]](c[0]) + "</b><span>" + c[2] + "</span></div>"; }).join("") + "</div>";
  };

  // --- mascota viva: flota, parpadea, sigue el puntero y salta cuando tiene algo que decir
  A.viva = function (cont, forma, expresion) {
    var st = { forma: forma || "gota", expresion: expresion || "reposo", mirada: null, cerrado: false }, pendiente = false;
    var m = document.createElement("span");
    m.className = "mascota";
    el(cont).appendChild(m);
    function pinta() { m.innerHTML = N.mascota({ forma: st.forma, expresion: st.cerrado ? "dormido" : st.expresion, mirada: st.mirada }); }
    document.addEventListener("pointermove", function (ev) {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(function () {
        var c = m.getBoundingClientRect();
        st.mirada = [(ev.clientX - c.left - c.width / 2) / 300, (ev.clientY - c.top - c.height / 2) / 300];
        pendiente = false; pinta();
      });
    });
    if (!QUIETO) setInterval(function () { st.cerrado = true; pinta(); setTimeout(function () { st.cerrado = false; pinta(); }, 140); }, 4200);
    m.addEventListener("animationend", function () { m.classList.remove("salta"); });
    pinta();
    return { pon: function (f, e) { st.forma = f || st.forma; st.expresion = e || st.expresion; pinta(); reinicia(m, "salta"); } };
  };
  A.di = function (bocadillo, etiqueta, html) {
    var b = el(bocadillo);
    b.innerHTML = "<strong>" + etiqueta + "</strong> " + html;
    reinicia(b, "pop");
  };

  // --- lista de campos para el cajón de móvil
  function arbol(actual) {
    return '<ul class="arbol"><li><a href="../home/"><b>0</b>Resumen</a></li>' + MODULOS.map(function (m, i) {
      return '<li><a href="../' + m.id + '/"' + (m.id === actual ? ' class="actual" aria-current="page"' : "") + "><b>" + (i + 1) + "</b>" + m.t + "</a></li>";
    }).join("") + "</ul>";
  }

  // --- barra superior: menú que se despliega al pasar el ratón y cajón de tres líneas en móvil
  A.marco = function (actual) {
    function mega(id, titulo, boton, rotulo, items) {
      return '<div class="menu__i" data-menu><button class="menu__b" type="button" aria-expanded="false" aria-controls="mega-' + id + '">' + rotulo + ico("abajo", "0 0 12 12") +
        '</button><div class="mega" id="mega-' + id + '"><div class="mega__in"><div><p class="mega__t">' + titulo + "</p>" + boton + '</div><ul class="mega__lista"><li style="--i:0;display:contents"><small>' +
        rotulo + "</small></li>" + items.map(function (it, i) {
          return '<li style="--i:' + (i + 1) + '"><a href="' + it[0] + '"' + (it[4] || "") + ">" + ico(it[1]) + "<b>" + it[2] + "</b><span>" + it[3] + "</span></a></li>";
        }).join("") + "</ul></div></div></div>";
    }
    el("#barra").innerHTML = '<div class="barra__in"><a class="marca" href="../home/"><span class="marca__m" data-mascota="circulo" data-expresion="feliz"></span>Anura <small>Análisis</small></a>' +
      '<nav class="menu" aria-label="Principal">' +
      mega("campo", "Explora el análisis paso a paso", '<a class="btn btn--suave" href="../home/">Ver resumen</a>', "Campo",
        MODULOS.map(function (m) { return ["../" + m.id + "/", m.id, m.t, m.d]; })) +
      mega("datos", "De dónde sale cada cifra", '<a class="btn btn--suave" href="../home/#datos">Cómo se cargan</a>', "Datos", [
        ["../home/#datos", "acid", "Carga ACID", "Una transacción: todo o nada"],
        ["../database/anura_acid.db", "base", "Base SQLite", "Descarga la base validada", " download"],
        ["https://github.com/Mogollo7/analisis-anura", "codigo", "Código", "Repositorio en GitHub"]
      ]) + '<a href="../home/#anura">Qué es Anura</a></nav>' +
      '<div class="barra__der"><button class="icono-b" type="button" id="tema">' + ico("tema") + '<span class="solo-lector">Cambiar tema</span></button>' +
      '<a class="btn" href="https://anura.juanlabs.me/inicio" target="_blank" rel="noopener noreferrer">Probar<span class="solo-lector"> Anura (se abre en otra pestaña)</span> ' + ico("externo") + '</a><button class="icono-b hamb" type="button" aria-expanded="false" aria-controls="cajon"><span></span><span></span><span></span><b class="solo-lector">Menú</b></button></div></div>' +
      '<div class="cajon" id="cajon"><nav aria-label="Secciones">' + arbol(actual) + '</nav><a class="btn" style="margin-top:24px" href="https://anura.juanlabs.me/inicio" target="_blank" rel="noopener noreferrer">Probar Anura<span class="solo-lector"> (se abre en otra pestaña)</span> ' + ico("externo") + "</a></div>";

    // menús: se abren al pasar el ratón, con clic o con teclado; Escape los cierra
    var abierto = null, reloj;
    function cierra() { if (abierto) { abierto.b.setAttribute("aria-expanded", "false"); abierto.m.classList.remove("abierto"); abierto = null; } }
    function abre(it) { clearTimeout(reloj); if (abierto === it) return; cierra(); abierto = it; it.b.setAttribute("aria-expanded", "true"); it.m.classList.add("abierto"); }
    [].forEach.call(document.querySelectorAll("[data-menu]"), function (nodo) {
      var it = { b: nodo.querySelector("button"), m: nodo.querySelector(".mega") };
      nodo.addEventListener("pointerenter", function (ev) { if (ev.pointerType === "mouse") abre(it); });
      nodo.addEventListener("pointerleave", function (ev) { if (ev.pointerType === "mouse") reloj = setTimeout(cierra, 180); });
      it.b.addEventListener("click", function () { if (abierto === it) cierra(); else abre(it); });
      nodo.addEventListener("focusout", function (ev) { if (!nodo.contains(ev.relatedTarget)) cierra(); });
    });
    var hamb = el(".hamb"), cajon = el("#cajon");
    function cajonA(si) { hamb.setAttribute("aria-expanded", si); cajon.classList.toggle("abierto", si); document.body.style.overflow = si ? "hidden" : ""; }
    hamb.onclick = function () { cajonA(hamb.getAttribute("aria-expanded") !== "true"); };
    cajon.addEventListener("click", function (ev) { if (ev.target.closest("a")) cajonA(false); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") { cierra(); cajonA(false); } });

    var raiz = document.documentElement;
    el("#tema").onclick = function () {
      raiz.dataset.theme = raiz.dataset.theme === "tinta" ? "papel" : "tinta";
      try { localStorage.setItem("tema", raiz.dataset.theme); } catch (e) { /* sin almacenamiento: el tema dura la visita */ }
    };
    var pie = el("#pie");
    if (pie) pie.innerHTML = "<span>Datos: GBIF, iNaturalist y evaluaciones del modelo de Anura.</span><span>Carga ACID con SQLite · <a href='https://github.com/Mogollo7/analisis-anura'>código en GitHub</a></span>";
    N.montar();
  };

  /* Un campo se navega en profundidad: campo -> tarjetas de subsección -> una subsección (y dentro, su detalle).
     cfg: id, bajada, foto [archivo, especie], datos [], guia [etiqueta, html],
          pasos(datos...) -> [{id, t, tarjeta: [cifra, texto], plomo, html, pinta(panel), guia: [etiqueta, html, expresion]}] */
  A.modulo = function (cfg) {
    var n = MODULOS.map(function (m) { return m.id; }).indexOf(cfg.id), mod = MODULOS[n], sig = MODULOS[n + 1];
    A.marco(cfg.id);
    Promise.all(cfg.datos.map(A.datos)).then(function (d) {
      var pasos = cfg.pasos.apply(null, d), vistos = {};
      el("#app").innerHTML = '<main class="lienzo"><nav class="migas" aria-label="Ruta"></nav><header class="cabeza"><div><h1>' + mod.t + '</h1><p class="bajada">' + cfg.bajada + "</p></div>" +
        '<figure class="foto"><img src="../assets/fotos/' + cfg.foto[0] + '.jpg" alt="Foto de ' + cfg.foto[1] + '" loading="lazy"><figcaption><em>' + cfg.foto[1] + "</em></figcaption></figure></header>" +
        '<div class="titulo" id="titulo"></div><div class="guia"><div id="guia-m"></div><div class="bocadillo" id="guia-b" aria-live="polite"></div></div><section class="panel" id="panel" tabindex="-1" aria-labelledby="titulo"></section></main>';
      var guia = A.viva("#guia-m"), panel = el("#panel"), migas = el(".migas"), titulo = el("#titulo");

      function ruta(p) {
        migas.innerHTML = '<a href="../home/">Inicio</a><i>/</i>' + (p ? '<a href="#">' + mod.t + "</a><i>/</i><span aria-current='page'>" + p.t + "</span>"
          : "<span aria-current='page'>Campo " + (n + 1) + " de " + MODULOS.length + "</span>");
      }
      function indice() { // nivel 2: solo las subsecciones, cada una con una cifra
        ruta();
        titulo.innerHTML = '<h2 class="solo-lector">Subsecciones</h2>';
        panel.innerHTML = '<div class="ruta">' + pasos.map(function (p, i) {
          return '<a class="tarjeta' + (vistos[i] ? " vista" : "") + '" href="#' + p.id + '" style="--i:' + i + '"><span class="tarjeta__n">' + (n + 1) + "." + (i + 1) + (vistos[i] ? " · visto" : "") + "</span><h3>" + p.t +
            "</h3><b>" + p.tarjeta[0] + "</b><small>" + p.tarjeta[1] + "</small>" + ico("flecha") + "</a>";
        }).join("") + "</div>" + '<nav class="avance" aria-label="Campos">' + (n ? '<a class="btn btn--suave" href="../' + MODULOS[n - 1].id + '/">' + ico("atras") + "<span>" + MODULOS[n - 1].t + "</span></a>" : "") +
          '<span class="avance__n" style="margin-left:auto">' + Object.keys(vistos).length + " de " + pasos.length + ' vistas</span><a class="btn" href="' + (sig ? "../" + sig.id + "/" : "../home/") + '"><span>' +
          (sig ? "Campo " + (n + 2) + ": " + sig.t : "Volver al resumen") + "</span>" + ico("flecha") + "</a></nav>";
        A.di("#guia-b", cfg.guia[0], cfg.guia[1]);
        guia.pon(N.FORMAS[n % N.FORMAS.length], N.expresionDe(cfg.guia[0]));
      }
      function paso(i) { // nivel 3: una subsección; su detalle fino se abre dentro
        var p = pasos[i], ultimo = i === pasos.length - 1;
        vistos[i] = 1;
        ruta(p);
        titulo.innerHTML = "<h2><small>" + (n + 1) + "." + (i + 1) + "</small>" + p.t + "</h2>" + (p.plomo ? '<p class="plomo">' + p.plomo + "</p>" : "");
        panel.innerHTML = p.html +
          '<nav class="avance" aria-label="Avance"><a class="btn btn--suave" href="#' + (i ? pasos[i - 1].id : "") + '">' + ico("atras") + "<span>" + (i ? pasos[i - 1].t : mod.t) + "</span></a>" +
          '<div class="avance__barra"><i style="width:' + (100 * (i + 1) / pasos.length) + '%"></i></div><span class="avance__n">' + (i + 1) + " de " + pasos.length + "</span>" +
          '<a class="btn" href="#' + (ultimo ? "" : pasos[i + 1].id) + '"><span>' + (ultimo ? "Ver todas" : pasos[i + 1].t) + "</span>" + ico("flecha") + "</a></nav>";
        if (p.pinta) p.pinta(panel);
        A.di("#guia-b", p.guia[0], p.guia[1]);
        guia.pon(N.FORMAS[(i + n + 1) % N.FORMAS.length], p.guia[2] || N.expresionDe(p.guia[0]));
      }
      function muestra(mover) {
        var i = pasos.map(function (p) { return p.id; }).indexOf(location.hash.slice(1));
        document.body.classList.toggle("en-paso", i >= 0);
        if (i >= 0) paso(i); else indice();
        A.cuenta(panel);
        reinicia(panel, "entra"); reinicia(titulo, "entra");
        if (mover) { scrollTo(0, 0); panel.focus({ preventScroll: true }); }
      }
      addEventListener("hashchange", function () { muestra(true); });
      muestra();
    }).catch(function (e) {
      el("#app").innerHTML = '<main class="lienzo"><div class="error" role="alert"><strong>No se pudieron cargar los datos.</strong> ' + esc(e.message) +
        ". Si abriste el archivo directamente, sírvelo con <code class='ndg-codigo-linea'>python -m http.server</code>.</div></main>";
    });
  };

  // --- etiqueta emergente compartida: cualquier elemento con data-tip
  var tip = document.createElement("div");
  tip.className = "tip"; tip.hidden = true;
  document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(tip); });
  document.addEventListener("pointermove", function (ev) {
    var t = ev.target.closest && ev.target.closest("[data-tip]");
    if (!t) { tip.hidden = true; return; }
    tip.innerHTML = t.getAttribute("data-tip");
    tip.hidden = false;
    var w = tip.offsetWidth, x = ev.clientX + 14, y = ev.clientY + 16;
    if (x + w > innerWidth - 8) x = ev.clientX - w - 14;
    if (y + tip.offsetHeight > innerHeight - 8) y = ev.clientY - tip.offsetHeight - 12;
    tip.style.left = Math.max(8, x) + "px"; tip.style.top = y + "px";
  });

  A.leyenda = function (items) {
    return '<div class="leyenda">' + items.map(function (i) { return '<span><i class="' + i[0] + '"></i>' + i[1] + "</span>"; }).join("") + "</div>";
  };
  A.fichas = function (sel, opciones, alCambiar) { // [[id, rótulo]]; filtro de una sola opción
    var c = el(sel);
    c.className = "chips";
    c.innerHTML = opciones.map(function (o, i) { return '<button class="chip" type="button" aria-pressed="' + (i === 0) + '" data-v="' + o[0] + '">' + o[1] + "</button>"; }).join("");
    c.onclick = function (ev) {
      var b = ev.target.closest("button");
      if (!b) return;
      [].forEach.call(c.children, function (x) { x.setAttribute("aria-pressed", x === b); });
      alCambiar(b.getAttribute("data-v"));
    };
    alCambiar(opciones[0][0]);
  };
  function escala(min, max, fmt, pasos) {
    var s = "";
    for (var i = 0; i <= pasos; i++) s += '<span style="left:' + (100 * i / pasos) + '%">' + fmt(min + (max - min) * i / pasos) + "</span>";
    return '<div class="fila fila--ancha fila--escala"><span></span><div class="escala">' + s + "</div><span></span></div>";
  }

  /* Barras horizontales. o: etiqueta(f), valor(f), [resto(f)] segundo tramo gris apilado, [max], [fmt], [clase(f)], [tip(f)] */
  A.barras = function (sel, filas, o) {
    var fmt = o.fmt || A.num;
    var total = function (f) { return o.valor(f) + (o.resto ? o.resto(f) : 0); };
    var max = o.max || Math.max.apply(null, filas.map(total));
    el(sel).innerHTML = '<div class="filas">' + filas.map(function (f, i) {
      var et = o.etiqueta(f);
      return '<div class="fila" style="--i:' + i + '" data-tip="' + esc(o.tip ? o.tip(f) : texto(et) + ": " + fmt(total(f))) + '"><span class="fila__et">' + et +
        '</span><span class="pista">' + (o.valor(f) ? '<i class="' + (o.clase ? o.clase(f) : "r-tinta") + '" style="width:' + (100 * o.valor(f) / max) + '%"></i>' : "") +
        (o.resto && o.resto(f) ? '<i class="r-gris" style="width:' + (100 * o.resto(f) / max) + '%"></i>' : "") +
        '</span><span class="fila__v">' + fmt(total(f)) + "</span></div>";
    }).join("") + "</div>";
  };

  /* Antes -> después sobre una misma escala. o: etiqueta(f), a(f), b(f), [min], [max], [fmt], [tip(f)] */
  A.pares = function (sel, filas, o) {
    var min = o.min || 0, max = o.max || 1, fmt = o.fmt || F.pct0;
    var x = function (v) { return 100 * (v - min) / (max - min); };
    el(sel).innerHTML = '<div class="filas">' + filas.map(function (f, i) {
      var a = o.a(f), b = o.b(f), et = o.etiqueta(f);
      return '<div class="fila fila--ancha" style="--i:' + i + '" data-tip="' + esc(texto(et) + ": " + fmt(a) + " → " + fmt(b) + (o.tip ? o.tip(f) : "")) +
        '"><span class="fila__et">' + et + '</span><span class="pista pista--eje"><span class="tramo" style="left:' + x(Math.min(a, b)) +
        "%;width:" + Math.abs(x(b) - x(a)) + '%"></span><span class="marca-p marca-p--a" style="left:' + x(a) +
        '%"></span><span class="marca-p marca-p--b" style="left:' + x(b) + '%"></span></span><span class="fila__v">' + fmt(a) + " → " + fmt(b) + "</span></div>";
    }).join("") + escala(min, max, fmt, 4) + "</div>";
  };

  /* Estimación con rango. o: etiqueta(f), v(f), lo(f), hi(f), min, max, [ref], fmt, [rango] texto del intervalo */
  A.intervalos = function (sel, filas, o) {
    var x = function (v) { return 100 * (v - o.min) / (o.max - o.min); };
    el(sel).innerHTML = '<div class="filas">' + filas.map(function (f, i) {
      var et = o.etiqueta(f);
      return '<div class="fila fila--ancha" style="--i:' + i + '" data-tip="' + esc(texto(et) + ": " + o.fmt(o.v(f)) + " (" + (o.rango || "IC 95 %") + ": " + o.fmt(o.lo(f)) + " a " + o.fmt(o.hi(f)) + ")") +
        '"><span class="fila__et">' + et + '</span><span class="pista pista--eje">' +
        (o.ref == null ? "" : '<span class="ref" style="left:' + x(o.ref) + '%"></span>') +
        '<span class="tramo tramo--ic" style="left:' + x(o.lo(f)) + "%;width:" + (x(o.hi(f)) - x(o.lo(f))) + '%"></span>' +
        '<span class="marca-p marca-p--b" style="left:' + x(o.v(f)) + '%"></span></span><span class="fila__v">' + o.fmt(o.v(f)) + "</span></div>";
    }).join("") + escala(o.min, o.max, o.fmt, 4) + "</div>";
  };

  /* Barra apilada al 100 %. segmentos: [[clave, nombre, clase]] */
  A.apilada = function (sel, filas, o) {
    el(sel).innerHTML = A.leyenda(o.segmentos.map(function (s) { return [s[2], s[1]]; })) + '<div class="filas">' + filas.map(function (f, i) {
      var total = o.segmentos.reduce(function (t, s) { return t + f.v[s[0]]; }, 0);
      return '<div class="fila" style="--i:' + i * 4 + '"><span class="fila__et">' + f.etiqueta + '</span><span class="pista" style="height:22px">' + o.segmentos.map(function (s) {
        return '<i class="' + s[2] + '" style="width:' + (100 * f.v[s[0]] / total) + '%" data-tip="' +
          esc(f.etiqueta + " · " + s[1] + ": " + A.num(f.v[s[0]]) + " (" + A.pct(f.v[s[0]] / total) + ")") + '"></i>';
      }).join("") + '</span><span class="fila__v">' + A.num(total) + "</span></div>";
    }).join("") + "</div>";
  };

  /* Dona de una proporción. Devuelve pon(fraccion, formato, etiqueta) para cambiarla con transición. */
  A.dona = function (sel) {
    var C = 2 * Math.PI * 42, c = el(sel);
    c.innerHTML = '<div class="dona"><svg viewBox="0 0 100 100" role="img"><circle class="d-b" cx="50" cy="50" r="42"/><circle class="d-a" cx="50" cy="50" r="42"/></svg><div class="dona__c"><b></b><span></span></div></div>';
    var a = c.querySelector(".d-a"), b = c.querySelector(".d-b"), n = c.querySelector("b");
    a.style.strokeDasharray = "0 " + C; b.style.strokeDasharray = C + " " + C;
    return function (frac, fmt, etiqueta) {
      c.querySelector("svg").setAttribute("aria-label", texto(etiqueta) + ": " + F[fmt](frac));
      c.querySelector(".dona__c span").innerHTML = etiqueta;
      sube(n, frac, F[fmt]);
      requestAnimationFrame(function () {
        a.style.strokeDasharray = Math.max(0, frac * C - 1.5) + " " + C;
        b.style.strokeDasharray = Math.max(0, (1 - frac) * C - 1.5) + " " + C;
        b.style.strokeDashoffset = -(frac * C);
      });
    };
  };

  // --- SVG: un solo eje vertical, rejilla fina, rótulo directo al final de cada serie
  var W = 680, H = 300, M = { l: 46, r: 96, t: 12, b: 40 };
  function mide(caja) { // el lienzo toma el ancho real para que el texto no encoja en móvil
    W = Math.max(330, Math.min(680, caja.clientWidth || 680));
    H = W < 480 ? 270 : 300;
    M.r = W < 480 ? 78 : 96;
  }
  function lienzo(o, cuerpo) {
    var pasos = o.pasos || 4, s = "", y = function (v) { return M.t + (H - M.t - M.b) * (1 - (v - o.min) / (o.max - o.min)); };
    for (var i = 0; i <= pasos && !o.sinEjes; i++) {
      var v = o.min + (o.max - o.min) * i / pasos;
      s += '<line class="rejilla" x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (M.l - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + o.fmtY(v) + "</text>";
    }
    return '<svg class="svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(o.alt) + '">' + s +
      (o.sinEjes ? "" : '<line class="eje" x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + y(o.min) + '" y2="' + y(o.min) + '"/>') + cuerpo(y) +
      '<text x="' + (M.l + (W - M.l - M.r) / 2) + '" y="' + (H - 4) + '" text-anchor="middle">' + o.tituloX + "</text></svg>";
  }

  /* Líneas sobre categorías ordenadas. o: x[], series[{nombre, v[], b}], min, max, fmtY, tituloX, alt, [foco] índice resaltado */
  A.lineas = function (sel, o) {
    mide(el(sel));
    var paso = (W - M.l - M.r) / (o.x.length - 1), px = function (i) { return M.l + paso * i; };
    el(sel).innerHTML = lienzo(o, function (y) {
      var s = o.x.map(function (t, i) { return '<text x="' + px(i) + '" y="' + (H - M.b + 16) + '" text-anchor="middle"' + (i === o.foco ? ' class="rotulo"' : "") + ">" + t + "</text>"; }).join("");
      s += '<g class="series">' + o.series.map(function (se) {
        return '<polyline class="serie' + (se.b ? " serie--b" : "") + '" points="' + se.v.map(function (v, i) { return px(i) + "," + y(v); }).join(" ") + '"/>';
      }).join("") + "</g>";
      o.series.forEach(function (se) {
        se.v.forEach(function (v, i) {
          s += '<circle class="p' + (se.b ? " p--b" : "") + (i === o.foco ? " p--foco" : "") + '" style="--i:' + i * 3 + '" cx="' + px(i) + '" cy="' + y(v) + '" r="4"/><circle class="diana" cx="' + px(i) + '" cy="' + y(v) +
            '" r="13" data-tip="' + esc(se.nombre + " · " + o.tituloX.toLowerCase() + " " + o.x[i] + ": " + o.fmtY(v)) + '"/>';
        });
      });
      // rótulos al final de cada serie; si dos series acaban juntas se separan 15 px para que no se pisen
      var ult = o.x.length - 1, previo = -Infinity;
      o.series.map(function (se) { return [y(se.v[ult]), se.nombre]; }).sort(function (a, b) { return a[0] - b[0]; }).forEach(function (r) {
        previo = Math.max(r[0], previo + 15);
        s += '<text class="rotulo" x="' + (px(ult) + 10) + '" y="' + (previo + 4) + '">' + r[1] + "</text>";
      });
      return s;
    });
  };

  /* Dispersión. o: x(p), y(p), xmin, xmax, min, max, fmtY, tituloX, tip(p), [rotulo(p)], [hueco(p)], [pasoX], [sinEjes],
     [vecino(p)] -> otro punto: al pasar por encima se dibuja la línea que los une */
  A.dispersion = function (sel, puntos, o) {
    mide(el(sel));
    var px = function (v) { return M.l + (W - M.l - M.r) * (v - o.xmin) / (o.xmax - o.xmin); }, yy;
    var c = el(sel);
    c.innerHTML = lienzo(o, function (y) {
      yy = y;
      var s = '<line class="enlace" visibility="hidden"/>';
      for (var t = Math.ceil(o.xmin); t <= o.xmax && !o.sinEjes; t += o.pasoX || 1) s += '<text x="' + px(t) + '" y="' + (H - M.b + 16) + '" text-anchor="middle">' + (o.fmtX ? o.fmtX(t) : t) + "</text>";
      puntos.forEach(function (p, i) {
        var cx = px(o.x(p)), cy = y(o.y(p)), r = o.rotulo && o.rotulo(p);
        s += '<circle class="p' + (o.hueco && o.hueco(p) ? " p--hueco" : "") + '" style="--i:' + i + '" cx="' + cx + '" cy="' + cy + '" r="5.5"/>';
        if (r) s += '<text class="rotulo" font-style="italic" x="' + (cx + 10) + '" y="' + (cy + 4) + '">' + r + "</text>";
      });
      puntos.forEach(function (p, i) { // las dianas van encima de todo para que el puntero siempre las encuentre
        s += '<circle class="diana' + (o.vecino ? " clic" : "") + '" data-i="' + i + '" cx="' + px(o.x(p)) + '" cy="' + y(o.y(p)) + '" r="12" data-tip="' + esc(o.tip(p)) + '"/>';
      });
      return s;
    });
    if (!o.vecino) return;
    var linea = c.querySelector(".enlace");
    c.querySelector("svg").addEventListener("pointerover", function (ev) {
      var i = ev.target.getAttribute && ev.target.getAttribute("data-i");
      if (i == null) return;
      var a = puntos[i], b = o.vecino(a);
      if (!b) return;
      linea.setAttribute("x1", px(o.x(a))); linea.setAttribute("y1", yy(o.y(a)));
      linea.setAttribute("x2", px(o.x(b))); linea.setAttribute("y2", yy(o.y(b)));
      linea.setAttribute("visibility", "visible");
    });
  };

  /* Tabla de reglas horizontales. cols: [{t, v(f), n}] */
  A.tabla = function (sel, cols, filas) {
    el(sel).innerHTML = '<div class="tabla-caja"><table class="ndg-tabla"><thead><tr>' + cols.map(function (c) {
      return "<th" + (c.n ? ' class="n"' : "") + ">" + c.t + "</th>";
    }).join("") + "</tr></thead><tbody>" + filas.map(function (f) {
      return "<tr>" + cols.map(function (c) { return "<td" + (c.n ? ' class="n"' : "") + ">" + c.v(f) + "</td>"; }).join("") + "</tr>";
    }).join("") + "</tbody></table></div>";
  };

  /* Aparición al entrar en pantalla (inicio): cualquier elemento con data-rev */
  A.revela = function () {
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visto"); A.cuenta(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.2 });
    [].forEach.call(document.querySelectorAll("[data-rev]"), function (n) { obs.observe(n); });
  };
})();
