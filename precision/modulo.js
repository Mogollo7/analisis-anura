A.modulo({
  id: "precision",
  bajada: "Qué acierta el modelo solo con la foto, y en qué especies se equivoca.",
  foto: ["dendropsophus-triangulum", "Dendropsophus triangulum"],
  guia: ["Resumen.", "Aquí está cuánto acierta el modelo solo con la foto. Ve de lo general a lo concreto: primero el total, después por género y por especie."],
  datos: ["modelo"],
  pasos: function (m) {
    var meta = m.meta, esp = m.especies, h = m.horribilis;
    var gen = m.generos.filter(function (g) { return g.especies > 1; }), solos = m.generos.filter(function (g) { return g.especies === 1; });
    var top1Solos = solos.reduce(function (s, g) { return s + g.top1 * g.n_test; }, 0) / solos.reduce(function (s, g) { return s + g.n_test; }, 0);
    var mismo = function (p) { return p.especie_a.split(" ")[0] === p.especie_b.split(" ")[0]; };
    var aciertos = Math.round(h.recall * h.n_test), dichas = Math.round(aciertos / h.precision);
    var peor = gen.slice().sort(function (a, b) { return a.top1 - b.top1; })[0];

    return [{
      id: "hoy", tarjeta: [A.pct(meta.top1_global, 0), "acierta a la primera"], t: "Hoy",
      plomo: "Resultado sobre " + A.num(meta.n_test) + " fotos de prueba de " + meta.n_especies + " especies.",
      html: '<div class="dos"><div id="d1"></div><div id="d2"></div></div>',
      pinta: function () {
        A.dona("#d1")(meta.top1_global, "pct0", "<strong>Top-1</strong>: acierta a la primera");
        A.dona("#d2")(meta.top3_global, "pct0", "<strong>Top-3</strong>: está entre sus tres respuestas");
      },
      guia: ["Resumen.", "Solo con la foto, el modelo acierta a la primera en algo más de la mitad de los casos. Casi siempre tiene la respuesta entre sus tres primeras: le cuesta decidirse entre parecidas."]
    }, {
      id: "generos", tarjeta: [A.pct(peor.top1, 0), "en el género más difícil"], t: "Por género",
      plomo: "Acierto a la primera en los géneros con más de una especie en el modelo.",
      html: A.cifras([[meta.spearman_congeneres, "dec2", "correlación entre especies del mismo género y acierto"], [meta.spearman_train, "dec2", "correlación entre fotos de entrenamiento y acierto"]]) +
        '<figure class="g"><div id="c"></div></figure>',
      pinta: function () {
        A.barras("#c", gen, {
          etiqueta: function (g) { return A.sp(g.genero) + " · " + g.especies + " especies"; },
          valor: function (g) { return g.top1; }, max: 1, fmt: function (v) { return A.pct(v, 0); },
          tip: function (g) { return g.genero + ": " + A.pct(g.top1) + " · " + g.n_test + " fotos de prueba"; }
        });
      },
      guia: ["Ojo:", "cuantas más especies del mismo género hay, peor acierta. " + A.sp(peor.genero) + " (" + peor.especies + " especies) se queda en " + A.pct(peor.top1, 0) +
        "; los " + solos.length + " géneros con una sola especie promedian " + A.pct(top1Solos, 0) + ". Es el efecto de los <a href='../centroides/#impacto'>centroides pegados</a>."]
    }, {
      id: "especies", tarjeta: [esp.length, "especies, de mejor a peor"], t: "Por especie",
      html: '<div id="f"></div><figure class="g" style="margin-top:16px"><div id="c"></div></figure>',
      pinta: function () {
        A.fichas("#f", [["peores", "Las 10 que más falla"], ["mejores", "Las 10 que mejor acierta"], ["todas", "Las " + esp.length]], function (v) {
          var lista = v === "todas" ? esp : v === "mejores" ? esp.slice(0, 10) : esp.slice(-10).reverse();
          A.barras("#c", lista, {
            etiqueta: function (e) { return A.sp(e.nombre); },
            valor: function (e) { return e.top1; }, max: 1, fmt: function (x) { return A.pct(x, 0); },
            tip: function (e) { return "<em>" + e.nombre + "</em><br>Top-1 " + A.pct(e.top1) + " · top-3 " + A.pct(e.top3) + "<br>" + e.n_test + " fotos de prueba"; }
          });
        });
      },
      guia: ["¿Sabías?", esp.filter(function (e) { return e.top1 >= 0.8; }).length + " especies superan el 80 % y " + esp.filter(function (e) { return e.top1 < 0.3; }).length +
        " no llegan al 30 %. Mira las que más falla: casi todas son del mismo par de géneros."]
    }, {
      id: "confusiones", tarjeta: [m.pares[0].confusiones, "confusiones en el peor par"], t: "Confusiones",
      plomo: "Los pares de especies que el modelo más intercambia.",
      html: '<figure class="g">' + A.leyenda([["r-tinta", "Mismo género"], ["r-trama", "Géneros distintos"]]) + '<div id="c"></div></figure>',
      pinta: function () {
        A.barras("#c", m.pares, {
          etiqueta: function (p) { return A.sp(p.especie_a) + " ↔ " + A.sp(p.especie_b); },
          valor: function (p) { return p.confusiones; },
          clase: function (p) { return mismo(p) ? "r-tinta" : "r-trama"; },
          tip: function (p) { return p.especie_a + " y " + p.especie_b + ": " + p.confusiones + " confusiones"; }
        });
      },
      guia: ["Para recordar.", m.pares.filter(mismo).length + " de los " + m.pares.length + " pares más confundidos son del mismo género. No es falta de fotos: son especies que se parecen de verdad."]
    }, {
      id: "rhinella", tarjeta: [A.pct(h.precision, 0), "de precisión real"], t: "Rhinella horribilis",
      html: '<div class="dos"><figure class="foto" style="aspect-ratio:3/2"><img src="../assets/fotos/rhinella-horribilis.jpg" alt="Sapo Rhinella horribilis sobre una hoja" loading="lazy"><figcaption><em>Rhinella horribilis</em></figcaption></figure><div>' +
        A.cifras([[h.top1, "pct0", "de sus " + h.n_test + " fotos, bien identificadas"], [h.precision, "pct0", "de las veces que el modelo la nombra, acierta"]]) + '<div id="t"></div></div></div>',
      pinta: function () {
        A.tabla("#t", [
          { t: "Acierto global", v: function (f) { return f[0]; } },
          { t: "Top-1", v: function (f) { return f[1]; }, n: true }
        ], [["Con las " + meta.n_especies + " especies", A.pct(meta.top1_global, 2)], ["Sin <em>R. horribilis</em>", A.pct(meta.top1_sin_horribilis, 2)]]);
      },
      guia: ["Cuidado.", "Parece la especie estrella, pero el modelo dijo «" + A.sp("R. horribilis") + "» " + dichas + " veces y solo " + aciertos +
        " eran suyas. Funciona como un cajón donde caen otros sapos. Su gemela, " + A.sp("Rhinella marina") + ", ni siquiera está en el catálogo: mírala en el <a href='../openset/#rhinella'>campo 5</a>.", "sorpresa"]
    }];
  }
});
