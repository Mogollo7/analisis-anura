A.modulo({
  id: "distribucion",
  bajada: "Cuántas especies hay, cuántos datos tiene cada una y cuáles conoce el modelo.",
  foto: ["dendrobates-truncatus", "Dendrobates truncatus"],
  guia: ["Resumen.", "Aquí ves cómo se reparten las especies del catálogo y cuáles conoce el modelo. Elige una tarjeta: cada una responde una sola pregunta."],
  datos: ["distribucion"],
  pasos: function (d) {
    var t = d.totales, esp = d.especies, ley = A.leyenda([["r-tinta", "En el modelo"], ["r-gris", "Fuera del modelo"]]);
    var mitad = 0, acum = 0;
    while (acum < t.registros / 2) acum += esp[mitad++].registros;
    var mayor = d.familias[0], ausente = d.familias.filter(function (f) { return f.en_modelo === 0; })[0];
    var fuera = t.especies - t.especies_modelo;

    return [{
      id: "familias", tarjeta: [t.familias, "familias en el catálogo"], t: "Familias",
      plomo: "Cada barra es una familia. El tramo en tinta son las especies que el modelo ya identifica.",
      html: '<figure class="g">' + ley + '<div id="c"></div></figure>',
      pinta: function () {
        A.barras("#c", d.familias, {
          etiqueta: function (f) { return f.familia; },
          valor: function (f) { return f.en_modelo; }, resto: function (f) { return f.especies - f.en_modelo; },
          tip: function (f) { return f.familia + ": " + f.especies + " especies, " + f.en_modelo + " en el modelo"; }
        });
      },
      guia: ["¿Sabías?", "<strong>" + mayor.familia + "</strong> es la familia más diversa (" + mayor.especies + " especies) y el modelo solo conoce " + mayor.en_modelo +
        ". De <strong>" + ausente.familia + "</strong>, con " + ausente.especies + ", no conoce ninguna."]
    }, {
      id: "registros", tarjeta: [A.num(t.registros), "registros en GBIF"], t: "Registros",
      plomo: "Un registro es una observación publicada en GBIF. Elige qué especies ver.",
      html: '<div id="f"></div><figure class="g" style="margin-top:16px">' + ley + '<div id="c"></div></figure>',
      pinta: function () {
        A.fichas("#f", [["todas", "Las 15 con más registros"], ["fuera", "Solo fuera del modelo"], ["dentro", "Solo en el modelo"]], function (v) {
          var lista = esp.filter(function (e) { return v === "todas" || (v === "dentro") === !!e.en_modelo; }).slice(0, 15);
          A.barras("#c", lista, {
            etiqueta: function (e) { return A.sp(e.nombre); },
            valor: function (e) { return e.registros; }, max: esp[0].registros,
            clase: function (e) { return e.en_modelo ? "r-tinta" : "r-gris"; },
            tip: function (e) { return e.nombre + " (" + e.familia + "): " + A.num(e.registros) + " registros"; }
          });
        });
      },
      guia: ["Ojo:", "solo <strong>" + mitad + " especies</strong> reúnen la mitad de los " + A.num(t.registros) + " registros. El modelo conoce el " +
        A.pct(t.especies_modelo / t.especies, 0) + " de las especies, pero esas suman el " + A.pct(t.registros_modelo / t.registros, 0) + " de los datos."]
    }, {
      id: "cola-larga", tarjeta: [t.especies_menos_100, "especies con menos de 100 registros"], t: "Cola larga",
      plomo: "Las mismas 300 especies, agrupadas por cuántos registros tienen.",
      html: A.cifras([[t.especies_menos_100, "num", "especies con menos de 100 registros"], [t.especies_menos_100 / t.especies, "pct0", "del catálogo"]]) +
        '<figure class="g">' + ley + '<div id="c"></div></figure>',
      pinta: function () {
        var cortes = [[0, 9, "Menos de 10"], [10, 99, "10 a 99"], [100, 999, "100 a 999"], [1000, Infinity, "1.000 o más"]];
        A.barras("#c", cortes.map(function (c) {
          var g = esp.filter(function (e) { return e.registros >= c[0] && e.registros <= c[1]; });
          var dentro = g.filter(function (e) { return e.en_modelo; }).length;
          return { et: c[2] + " registros", dentro: dentro, fuera: g.length - dentro };
        }), {
          etiqueta: function (f) { return f.et; }, valor: function (f) { return f.dentro; }, resto: function (f) { return f.fuera; },
          tip: function (f) { return f.et + ": " + (f.dentro + f.fuera) + " especies, " + f.dentro + " en el modelo"; }
        });
      },
      guia: ["Cuidado.", "Casi la mitad del catálogo tiene muy pocos datos. Son justo las especies que el modelo no ha visto, y las más difíciles de fotografiar para enseñárselas."]
    }, {
      id: "explorar", tarjeta: [A.num(t.especies), "especies para buscar"], t: "Explorar",
      html: '<label class="campo" for="q">Busca una especie, un género o una familia<input class="filtro" id="q" type="search" placeholder="Pristimantis" autocomplete="off"></label>' +
        '<p class="g__pie" id="n" aria-live="polite" style="margin:0 0 8px"></p><div id="c"></div>',
      pinta: function () {
        function pinta() {
          var q = document.getElementById("q").value.trim().toLowerCase();
          var lista = esp.filter(function (e) { return !q || (e.nombre + " " + e.familia).toLowerCase().indexOf(q) >= 0; });
          document.getElementById("n").textContent = lista.length + " especies" + (lista.length > 12 ? "; se muestran las 12 con más registros." : ".");
          A.tabla("#c", [
            { t: "Especie", v: function (e) { return A.sp(e.nombre); } },
            { t: "Familia", v: function (e) { return e.familia; } },
            { t: "Registros", v: function (e) { return A.num(e.registros); }, n: true },
            { t: "En el modelo", v: function (e) { return e.en_modelo ? "<strong>Sí</strong>" : "No"; } }
          ], lista.slice(0, 12));
        }
        document.getElementById("q").addEventListener("input", pinta);
        pinta();
      },
      guia: ["Truco.", "Escribe un género, por ejemplo <em>Dendropsophus</em>, y mira cuántas de sus especies conoce el modelo. Las " + fuera +
        " que faltan son el problema del <a href='../openset/'>campo 5</a>."]
    }];
  }
});
