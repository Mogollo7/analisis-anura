/* @ds-bundle: {"format":4,"namespace":"NotasDotGrid","components":[{"name":"Mascota"},{"name":"Nota"},{"name":"Tabla"},{"name":"Codigo"},{"name":"Portada"},{"name":"Indice"},{"name":"Diapositiva"},{"name":"FondoPuntos"}]} */
(function (raiz) {
  "use strict";

  // Cuerpos planos (viewBox 0 0 100 100). cy = altura de la cara, r = radio del volumen sobre el que viven los ojos.
  var FORMAS = {
    circulo: { d: '<circle cx="50" cy="52" r="40"/>', cy: 52, r: 30 },
    gota: { d: '<path d="M50 8 C58 22 84 40 84 62 C84 80 69 93 50 93 C31 93 16 80 16 62 C16 40 42 22 50 8 Z"/>', cy: 63, r: 26 },
    nube: { d: '<circle cx="30" cy="60" r="20"/><circle cx="52" cy="44" r="25"/><circle cx="73" cy="58" r="21"/><rect x="14" y="58" width="78" height="28" rx="14"/>', cy: 60, r: 28 },
    cubo: { d: '<rect x="16" y="20" width="68" height="66" rx="13" transform="rotate(-4 50 53)"/>', cy: 54, r: 28 },
    triangulo: { d: '<path d="M50 12 Q57 12 63 24 L89 72 Q96 88 80 90 L20 90 Q4 88 11 72 L37 24 Q43 12 50 12 Z"/>', cy: 68, r: 23 },
    flor: { d: '<circle cx="50" cy="52" r="28"/><circle cx="50" cy="24" r="16"/><circle cx="76" cy="40" r="16"/><circle cx="76" cy="66" r="16"/><circle cx="50" cy="80" r="16"/><circle cx="24" cy="66" r="16"/><circle cx="24" cy="40" r="16"/>', cy: 52, r: 26 }
  };

  // La emocion vive solo en los ojos. t: p = pildora, a = arco (ojo sonriente), l = linea (cerrado).
  // g = giro propio en grados (positivo = horario), dy = desplazamiento vertical, mirada = direccion por defecto.
  var P = { t: "p", w: 8, h: 20 };
  function ojos(izq, der, mirada) { return { izq: izq, der: der || izq, mirada: mirada || [0, 0] }; }
  var EXPRESIONES = {
    reposo: ojos(P),
    feliz: ojos({ t: "a", w: 5 }),
    celebra: ojos({ t: "a", w: 5.5, g: -12 }, { t: "a", w: 5.5, g: 12 }, [0, -0.25]),
    alerta: ojos({ t: "p", w: 9, h: 27 }),
    sorpresa: ojos({ t: "p", w: 15, h: 17 }),
    duda: ojos({ t: "p", w: 8, h: 22, dy: -2 }, { t: "p", w: 8, h: 13, dy: 3 }),
    guino: ojos({ t: "l" }, P),
    pensando: ojos({ t: "p", w: 8, h: 17 }, null, [0.55, -0.6]),
    leyendo: ojos({ t: "p", w: 8, h: 12 }, null, [0, 0.7]),
    serio: ojos({ t: "p", w: 8, h: 18, g: -14 }, { t: "p", w: 8, h: 18, g: 14 }),
    triste: ojos({ t: "p", w: 8, h: 16, g: 14, dy: 2 }, { t: "p", w: 8, h: 16, g: -14, dy: 2 }, [0, 0.3]),
    dormido: ojos({ t: "l" }, null, [0, 0.3])
  };

  // Etiqueta de una nota -> expresion.
  var NOTAS = [["Resumen", "feliz"], ["Recuerda", "reposo"], ["Para recordar", "celebra"], ["Ojo", "alerta"],
    ["Cuidado", "sorpresa"], ["Truco", "guino"], ["Ejemplo", "pensando"], ["Dato", "reposo"], ["¿Sab", "duda"],
    ["Práctica", "leyendo"], ["Error", "serio"]];

  var SEP_OJOS = 0.42; // radianes entre el centro de la cara y cada ojo
  var cuenta = 0;
  function n(v) { return Math.round(v * 100) / 100; }
  function limite(v) { return Math.max(-1, Math.min(1, +v || 0)); }

  // Un ojo proyectado: se desplaza, se estrecha y se inclina como si estuviera pintado sobre una esfera.
  function ojo(e, lado, f, yaw, pitch, relleno) {
    var a = yaw + lado * SEP_OJOS;
    var x = 50 + f.r * Math.sin(a) * Math.cos(pitch * 0.6);
    var y = f.cy + (e.dy || 0) + f.r * 0.7 * Math.sin(pitch);
    var sx = Math.max(0.3, Math.cos(a));
    var sy = Math.max(0.55, Math.cos(pitch)) * (0.85 + 0.15 * Math.cos(a));
    var giro = (e.g || 0) + 28 * Math.sin(a) * Math.sin(pitch);
    var w = e.w || 8, h = e.h || 20, forma;
    if (e.t === "a") forma = '<path d="M' + -w + " 4 Q0 " + -(w + 3) + " " + w + ' 4" fill="none" stroke-width="5" stroke-linecap="round" style="stroke:' + relleno + '"/>';
    else if (e.t === "l") forma = '<rect x="-9" y="-3" width="18" height="6" rx="3" style="fill:' + relleno + '"/>';
    else forma = '<rect x="' + -w / 2 + '" y="' + -h / 2 + '" width="' + w + '" height="' + h + '" rx="' + w / 2 + '" style="fill:' + relleno + '"/>';
    return '<g transform="translate(' + n(x) + " " + n(y) + ") rotate(" + n(giro) + ") scale(" + n(sx) + " " + n(sy) + ')">' + forma + "</g>";
  }

  /** SVG de la mascota. opciones: forma, expresion, mirada [x, y] de -1 a 1, tinta y papel (colores literales para exportar). */
  function mascota(o) {
    o = o || {};
    var f = FORMAS[o.forma] || FORMAS.circulo;
    var ex = EXPRESIONES[o.expresion] || EXPRESIONES.reposo;
    var m = o.mirada || ex.mirada;
    var yaw = limite(m[0]) * 0.7, pitch = limite(m[1]) * 0.55;
    var tinta = o.tinta || "var(--tinta, #000)", papel = o.papel || "var(--papel, #fff)";
    var id = "ndg-m" + (++cuenta);
    return '<svg class="ndg-mascota" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<clipPath id="' + id + '">' + f.d + "</clipPath>" +
      '<g style="fill:' + tinta + '">' + f.d + "</g>" +
      '<g clip-path="url(#' + id + ')">' + ojo(ex.izq, -1, f, yaw, pitch, papel) + ojo(ex.der, 1, f, yaw, pitch, papel) + "</g></svg>";
  }

  function expresionDe(etiqueta) {
    for (var i = 0; i < NOTAS.length; i++) if (String(etiqueta).indexOf(NOTAS[i][0]) === 0) return NOTAS[i][1];
    return "reposo";
  }

  /** HTML de una nota. opciones: etiqueta, html (contenido ya en HTML), resumen (bool), indice (rota la forma), forma, expresion. */
  function nota(o) {
    var formas = Object.keys(FORMAS);
    var forma = o.forma || formas[(o.indice || 0) % formas.length];
    var svg = mascota({ forma: forma, expresion: o.expresion || expresionDe(o.etiqueta), mirada: o.mirada || [0.55, 0.1], tinta: o.tinta, papel: o.papel });
    return '<aside class="ndg-nota' + (o.resumen ? " ndg-nota--resumen" : "") + '"><div class="ndg-nota__mascota">' + svg +
      '</div><div class="ndg-nota__texto"><p><strong>' + o.etiqueta + "</strong> " + (o.html || "") + "</p></div></aside>";
  }

  /** Esfera de puntos de la portada (espiral de Fibonacci en proyeccion ortografica). */
  function esferaPuntos(o) {
    o = o || {};
    var cant = o.n || 1500, tam = o.tam || 560, giro = o.giro == null ? 0.55 : o.giro, color = o.color || "var(--papel, #fff)";
    var ga = Math.PI * (3 - Math.sqrt(5)), pts = [], c = tam / 2, R = tam * 0.46, out = "";
    for (var i = 0; i < cant; i++) {
      var y = 1 - 2 * (i + 0.5) / cant, r = Math.sqrt(1 - y * y), th = ga * i;
      var x = Math.cos(th) * r, z = Math.sin(th) * r;
      pts.push([x, y * Math.cos(giro) - z * Math.sin(giro), y * Math.sin(giro) + z * Math.cos(giro)]);
    }
    pts.sort(function (p, q) { return p[2] - q[2]; });
    for (i = 0; i < cant; i++) {
      var prof = (pts[i][2] + 1) / 2;
      out += '<circle cx="' + n(c + pts[i][0] * R) + '" cy="' + n(c + pts[i][1] * R) + '" r="' + n(0.7 + 2.5 * prof) +
        '" fill-opacity="' + n(0.08 + 0.78 * prof) + '"/>';
    }
    return '<svg viewBox="0 0 ' + tam + " " + tam + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g style="fill:' + color + '">' + out + "</g></svg>";
  }

  function leer(el) {
    var m = (el.getAttribute("data-mirada") || "").split(",");
    return { forma: el.getAttribute("data-mascota"), expresion: el.getAttribute("data-expresion"), mirada: m.length === 2 ? [m[0], m[1]] : null };
  }

  /** La mascota de `el` gira los ojos hacia el puntero. Solo web. */
  function seguir(el) {
    var base = leer(el);
    document.addEventListener("pointermove", function (ev) {
      var c = el.getBoundingClientRect();
      base.mirada = [(ev.clientX - c.left - c.width / 2) / 260, (ev.clientY - c.top - c.height / 2) / 260];
      el.innerHTML = mascota(base);
    });
  }

  /** Dibuja cada <span data-mascota="gota" data-expresion="feliz" data-mirada="0.5,-0.2" data-seguir>. */
  function montar(dentro) {
    var lista = (dentro || document).querySelectorAll("[data-mascota]");
    for (var i = 0; i < lista.length; i++) {
      lista[i].innerHTML = mascota(leer(lista[i]));
      if (lista[i].hasAttribute("data-seguir")) seguir(lista[i]);
    }
  }

  raiz.NotasDotGrid = {
    FORMAS: Object.keys(FORMAS), EXPRESIONES: Object.keys(EXPRESIONES),
    mascota: mascota, nota: nota, expresionDe: expresionDe, esferaPuntos: esferaPuntos, montar: montar, seguir: seguir
  };
})(typeof window !== "undefined" ? window : globalThis);
