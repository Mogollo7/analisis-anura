A.modulo({
  id: "centroides",
  bajada: "El modelo resume cada especie en un punto. Qué tan lejos queda de las demás decide cuánto acierta.",
  foto: ["pristimantis-paisa", "Pristimantis paisa"],
  guia: ["Resumen.", "Un centroide es cómo el modelo resume una especie en un solo punto. Empieza por <strong>Qué es</strong> y termina en <strong>Impacto</strong>: ahí se ve por qué unas especies fallan y otras no."],
  datos: ["centroides"],
  pasos: function (c) {
    var esp = c.especies, porNombre = {};
    esp.forEach(function (e) { porNombre[e.nombre] = e; });
    var cerca = esp[0], lejos = esp[esp.length - 1], d2 = function (v) { return A.dec(v, 2); };
    var gen = c.taxonomia[0], otra = c.taxonomia[2];
    var nombres = { same_genus: "Mismo género", same_family_diff_genus: "Misma familia, otro género", diff_family: "Otra familia" };

    // Dibujo explicativo: dos nubes de fotos, sus centroides y las dos medidas. Posiciones fijas, no son datos.
    function esquema() {
      var s = "", i = 0;
      function nube(cx, cy, r, n, hueco) {
        for (var k = 0; k < n; k++) {
          var a = k * 2.4, d = r * Math.sqrt((k + 0.5) / n);
          s += '<circle class="p' + (hueco ? " p--b" : "") + '" style="--i:' + (i++) + '" cx="' + (cx + d * Math.cos(a)) + '" cy="' + (cy + d * Math.sin(a)) + '" r="4"/>';
        }
      }
      nube(190, 150, 78, 26, false); nube(470, 140, 58, 20, true);
      return '<svg class="svg" viewBox="0 0 680 300" role="img" aria-label="Dos nubes de fotos, cada una con su centroide; la distancia entre centroides y el tamaño de cada nube">' + s +
        '<g class="series"><line class="enlace" x1="190" y1="150" x2="470" y2="140"/><circle cx="190" cy="150" r="78" fill="none" class="rejilla" stroke-dasharray="3 4"/></g>' +
        '<circle class="p p--foco" style="--i:50" cx="190" cy="150" r="8"/><circle class="p p--foco" style="--i:54" cx="470" cy="140" r="8"/>' +
        '<text class="rotulo" x="330" y="132" text-anchor="middle">distancia a la vecina</text><text class="rotulo" x="190" y="250" text-anchor="middle">dispersión</text>' +
        '<text x="190" y="54" text-anchor="middle">fotos de la especie A</text><text x="470" y="64" text-anchor="middle">fotos de la especie B</text></svg>';
    }

    return [{
      id: "que-es", tarjeta: ["1 punto", "resume cada especie"], t: "Qué es",
      html: '<figure class="g">' + esquema() + '<p class="g__pie">Esquema ilustrativo: cada punto pequeño es una foto; el anillo grande, el centroide de la especie.</p></figure>' +
        '<ol class="tres"><li><div><b>Centroide</b><span>El punto medio de todas las fotos de entrenamiento de una especie.</span></div></li>' +
        "<li><div><b>Dispersión</b><span>Qué tan repartidas están las fotos alrededor de su centroide.</span></div></li>" +
        "<li><div><b>Distancia a la vecina</b><span>Qué tan lejos queda el centroide de la especie más parecida.</span></div></li></ol>",
      guia: ["Dato de clase.", "El modelo convierte cada foto en un punto. En el ranking de especies, la foto se compara con el <strong>centroide</strong> de cada una. Si dos centroides están pegados, se parecen demasiado y se confunden."]
    }, {
      id: "mapa", tarjeta: [esp.length, "centroides en el mapa"], t: "Mapa",
      plomo: "Los 24 centroides del diagnóstico, aplanados a dos dimensiones. Pasa por un punto para ver su vecina.",
      html: '<figure class="g">' + A.leyenda([["r-tinta", "Acierta la mitad o más"], ["r-hueco", "Acierta menos de la mitad"]]) + '<div id="c"></div>' +
        '<p class="g__pie">Proyección PCA: conserva el ' + A.pct(c.varianza_pca[0] + c.varianza_pca[1], 0) + " de la variación, así que las distancias son aproximadas.</p></figure>",
      pinta: function () {
        var xs = esp.map(function (e) { return e.x; }), ys = esp.map(function (e) { return e.y; });
        var rot = {}; rot[cerca.nombre] = rot[lejos.nombre] = 1;
        A.dispersion("#c", esp, {
          x: function (e) { return e.x; }, y: function (e) { return e.y; }, sinEjes: true,
          xmin: Math.min.apply(null, xs) - 0.05, xmax: Math.max.apply(null, xs) + 0.05,
          min: Math.min.apply(null, ys) - 0.06, max: Math.max.apply(null, ys) + 0.06,
          tituloX: "Cada punto es el centroide de una especie", alt: "Mapa de los 24 centroides: las especies del mismo género quedan cerca",
          hueco: function (e) { return e.top1_visual < 0.5; },
          rotulo: function (e) { return rot[e.nombre] ? e.nombre : null; },
          vecino: function (e) { return porNombre[e.vecina]; },
          tip: function (e) { return "<em>" + e.nombre + "</em><br>Vecina: <em>" + e.vecina + "</em> (a " + d2(e.dist_vecina) + ")<br>Acierto solo con imagen: " + A.pct(e.top1_visual, 0); }
        });
      },
      guia: ["Ojo:", A.sp(cerca.nombre) + " y " + A.sp(cerca.vecina) + " casi se tocan: su distancia es " + d2(cerca.dist_vecina) + ". " + A.sp(lejos.nombre) +
        ", en cambio, está sola a " + d2(lejos.dist_vecina) + " de su vecina."]
    }, {
      id: "parentesco", tarjeta: [A.dec(otra.media / gen.media, 1) + " ×", "más lejos si son de otra familia"], t: "Parentesco",
      plomo: "Distancia entre centroides según el parentesco de las dos especies. El punto es la media; la franja, del mínimo al máximo.",
      html: '<figure class="g"><div id="c"></div></figure>',
      pinta: function () {
        A.intervalos("#c", c.taxonomia, {
          etiqueta: function (f) { return nombres[f.relacion] + " (" + f.n_pares + " pares)"; },
          v: function (f) { return f.media; }, lo: function (f) { return f.minimo; }, hi: function (f) { return f.maximo; },
          min: 0, max: 1.6, fmt: d2, rango: "mín. a máx."
        });
      },
      guia: ["Para recordar.", "El modelo sí ordena por parentesco: dos especies de otra familia quedan a " + d2(otra.media) + " de media, y dos del mismo género a " + d2(gen.media) +
        ". El problema no es el modelo en general, son las especies hermanas."]
    }, {
      id: "impacto", tarjeta: [d2(c.spearman_separacion), "correlación con el acierto"], t: "Impacto",
      plomo: "Separación = distancia a la vecina dividida por la dispersión propia. Cada punto es una especie.",
      html: A.cifras([[c.spearman_separacion, "dec2", "correlación entre separación y acierto"], [c.spearman_n, "dec2", "correlación entre número de fotos y acierto"]]) +
        '<figure class="g"><div id="c"></div></figure><details><summary>Ver las 24 especies en tabla</summary><div id="t"></div></details>',
      pinta: function () {
        var rot = {}; rot[cerca.nombre] = rot[lejos.nombre] = 1;
        A.dispersion("#c", esp, {
          x: function (e) { return e.separacion; }, y: function (e) { return e.top1_visual; },
          xmin: 0, xmax: 1.6, pasoX: 0.4, fmtX: function (v) { return A.dec(v, 1); }, min: 0, max: 1, fmtY: function (v) { return A.pct(v, 0); },
          tituloX: "Separación respecto a la especie más parecida", alt: "A mayor separación del centroide, mayor acierto",
          hueco: function (e) { return e.top1_visual < 0.5; },
          rotulo: function (e) { return rot[e.nombre] ? e.nombre : null; },
          tip: function (e) { return "<em>" + e.nombre + "</em><br>Separación " + d2(e.separacion) + " · acierto " + A.pct(e.top1_visual, 0) + "<br>" + A.num(e.n) + " fotos"; }
        });
        A.tabla("#t", [
          { t: "Especie", v: function (e) { return A.sp(e.nombre); } },
          { t: "Vecina más cercana", v: function (e) { return A.sp(e.vecina); } },
          { t: "Separación", v: function (e) { return d2(e.separacion); }, n: true },
          { t: "Fotos", v: function (e) { return A.num(e.n); }, n: true },
          { t: "Acierto", v: function (e) { return A.pct(e.top1_visual, 0); }, n: true }
        ], esp);
      },
      guia: ["Ojo: esto es lo que mueve las cifras.", "Cuanto más separado está un centroide de su vecino, más acierta el modelo. Tener más fotos casi no cambia nada: " +
        A.sp(lejos.nombre) + " acierta el " + A.pct(lejos.top1_visual, 0) + " y " + A.sp(cerca.nombre) + " el " + A.pct(cerca.top1_visual, 0) + "."]
    }, {
      id: "servidor", tarjeta: ["4 reglas", "para calcularlos"], t: "En el servidor",
      plomo: "Así calcula los centroides el módulo de administración de Anura.",
      html: '<ol class="tres"><li><div><b>Solo fotos de entrenamiento</b><span>De la versión vigente del conjunto y sin exclusión activa.</span></div></li>' +
        "<li><div><b>Media normalizada</b><span>El centroide es la media de los vectores de la especie, llevada a longitud 1.</span></div></li>" +
        "<li><div><b>Supercentroides</b><span>Los de género y familia promedian centroides: un voto por especie, no por foto.</span></div></li>" +
        "<li><div><b>Centroides regionales</b><span>Solo con observaciones dentro de la subregión, y solo si hay 3 individuos o más.</span></div></li></ol>",
      guia: ["Ojo: de dónde salen estos números.", "El lote de centroides del servidor vive en su base de datos y no se publica aquí. Las cifras de este campo vienen del diagnóstico de 24 especies hecho con el mismo método."]
    }];
  }
});
