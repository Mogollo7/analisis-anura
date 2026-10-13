A.modulo({
  id: "mejora",
  bajada: "Si el modelo sabe dónde se tomó la foto, descarta las especies que no viven ahí.",
  foto: ["boana-punctata", "Boana punctata"],
  guia: ["Resumen.", "Esta es la mejora más grande que se ha medido. Empieza moviendo el control de <strong>Ubicación</strong> y mira cómo cambia el acierto."],
  datos: ["modelo", "mejora"],
  pasos: function (m, mj) {
    var prior = mj.prior, rk = mj.ranking, base = prior.barrido[0], pct0 = function (v) { return A.pct(v, 0); };
    var corto = function (v) { return A.dec(v, 2).replace(/,?0+$/, "") || "0"; };
    var pesos = prior.barrido.map(function (b) { return corto(b.peso); });
    var mejor = prior.barrido.map(function (b) { return b.peso; }).indexOf(prior.mejor.peso);
    var lejos = prior.distancia[prior.distancia.length - 1];
    var suben = rk.especies.filter(function (e) { return e.top1_geo > e.top1_visual; }), bajan = rk.especies.filter(function (e) { return e.top1_geo < e.top1_visual; });
    var nombres = { fp32: "32 bits (original)", fp16: "16 bits", int8: "8 bits" };
    var q = {}; m.cuantizacion.forEach(function (c) { q[c.variante] = c; });

    return [{
      id: "ubicacion", tarjeta: [pct0(base.top1) + " → " + pct0(prior.mejor.top1), "de acierto al usar la ubicación"], t: "Ubicación",
      plomo: "Mueve el control: el peso decide cuánto cuenta la ubicación frente a la imagen.",
      html: '<label class="desliza" for="peso">Peso de la ubicación: <span id="peso-v"></span><input id="peso" type="range" min="0" max="' + (pesos.length - 1) + '" step="1" value="0">' +
        '<span class="desliza__m"><span>Solo imagen</span><span>Manda la ubicación</span></span></label>' +
        '<div class="cifras"><div class="cifra"><b id="v1"></b><span>acierta a la primera (top-1)</span></div><div class="cifra"><b id="v3"></b><span>entre las tres primeras (top-3)</span></div></div>' +
        '<figure class="g"><div id="c"></div><p class="g__pie">Sobre ' + A.num(prior.cobertura.test_con_coords) + " fotos de prueba con coordenadas. El eje empieza en 50 %.</p></figure>",
      pinta: function () {
        var r = document.getElementById("peso"), caja = document.getElementById("c");
        function pinta(animar) {
          var i = +r.value, b = prior.barrido[i];
          caja.classList.toggle("sin-anim", !animar);
          A.lineas(caja, {
            x: pesos, foco: i, min: 0.5, max: 1, pasos: 5, fmtY: pct0, tituloX: "Peso de la ubicación", alt: "Acierto según el peso dado a la ubicación",
            series: [{ nombre: "Top-3", v: prior.barrido.map(function (x) { return x.top3; }), b: true }, { nombre: "Top-1", v: prior.barrido.map(function (x) { return x.top1; }) }]
          });
          document.getElementById("peso-v").textContent = pesos[i];
          r.setAttribute("aria-valuetext", "peso " + pesos[i] + ", top-1 " + A.pct(b.top1));
          A.sube(document.getElementById("v1"), b.top1, A.pct);
          A.sube(document.getElementById("v3"), b.top3, A.pct);
        }
        r.addEventListener("input", function () { pinta(false); });
        pinta(true);
        setTimeout(function () { if (+r.value === 0) { r.value = mejor; pinta(false); } }, 1400); // se coloca solo en el mejor peso
      },
      guia: ["Para recordar.", "Con peso " + pesos[mejor] + " el acierto pasa de <strong>" + A.pct(base.top1) + " a " + A.pct(prior.mejor.top1) + "</strong>. Si te pasas, vuelve a bajar: con peso 2 queda en " +
        A.pct(prior.barrido[prior.barrido.length - 1].top1) + ", porque la ubicación empieza a mandar sobre la foto.", "celebra"]
    }, {
      id: "distancia", tarjeta: [lejos.umbral_km + " km", "a partir de ahí no ayuda"], t: "Cerca o lejos",
      plomo: "Acierto de las fotos que están al menos a esa distancia de la observación de entrenamiento más cercana.",
      html: '<figure class="g"><div id="c"></div></figure><details><summary>Ver los datos en tabla</summary><div id="t"></div></details>',
      pinta: function () {
        A.lineas("#c", {
          x: prior.distancia.map(function (d) { return corto(d.umbral_km); }), min: 0.5, max: 0.9, fmtY: pct0, tituloX: "Distancia mínima a la observación más cercana (km)",
          alt: "La ventaja de usar la ubicación se reduce al alejarse de las observaciones de entrenamiento",
          series: [{ nombre: "Solo imagen", v: prior.distancia.map(function (d) { return d.top1_solo_imagen; }), b: true }, { nombre: "Con ubicación", v: prior.distancia.map(function (d) { return d.top1_con_ubicacion; }) }]
        });
        A.tabla("#t", [
          { t: "Distancia mínima (km)", v: function (d) { return corto(d.umbral_km); }, n: true },
          { t: "Fotos", v: function (d) { return A.num(d.n); }, n: true },
          { t: "Solo imagen", v: function (d) { return A.pct(d.top1_solo_imagen); }, n: true },
          { t: "Con ubicación", v: function (d) { return A.pct(d.top1_con_ubicacion); }, n: true }
        ], prior.distancia);
      },
      guia: ["Ojo: aquí vuelve la distribución.", "La ubicación solo ayuda si ya hay observaciones cerca. A " + lejos.umbral_km + " km o más no aporta nada, aunque son solo " + lejos.n +
        " fotos y esa cifra es poco fiable. Las zonas poco muestreadas se quedan con el modelo de solo imagen."]
    }, {
      id: "especies", tarjeta: [suben.length + " de " + rk.especies.length, "especies mejoran"], t: "Quién gana",
      plomo: "Otra evaluación, más grande (" + A.num(rk.n) + " fotos): acierto solo con imagen y con imagen más ubicación.",
      html: '<div id="f"></div><figure class="g" style="margin-top:16px">' + A.leyenda([["r-hueco", "Solo imagen"], ["r-tinta", "Imagen + ubicación"]]) + '<div id="c"></div></figure>',
      pinta: function () {
        A.fichas("#f", [["suben", "Las que más ganan"], ["bajan", "Las que pierden (" + bajan.length + ")"], ["todas", "Las " + rk.especies.length]], function (v) {
          var lista = v === "todas" ? rk.especies : v === "bajan" ? bajan.slice().reverse() : suben.slice(0, 8);
          A.pares("#c", lista, {
            etiqueta: function (e) { return A.sp(e.nombre); }, a: function (e) { return e.top1_visual; }, b: function (e) { return e.top1_geo; },
            tip: function (e) { return " · " + A.num(e.n) + " fotos"; }
          });
        });
      },
      guia: ["¿Sabías?", "En conjunto el acierto pasa de " + A.pct(rk.visual.top1_acc) + " a " + A.pct(rk.geo.top1_acc) + ". La que más gana es " + A.sp(suben[0].nombre) + ": de " +
        pct0(suben[0].top1_visual) + " a " + pct0(suben[0].top1_geo) + ". Pero " + bajan.length + " especies empeoran: la ubicación no es gratis."]
    }, {
      id: "telefono", tarjeta: [A.num(q.fp16.mb) + " MB", "el modelo en el teléfono"], t: "En el teléfono",
      plomo: "Para usarlo en campo hay que reducir el modelo. Tamaño de cada versión.",
      html: '<figure class="g"><div id="c"></div></figure><div id="t" style="margin-top:14px"></div>',
      pinta: function () {
        A.barras("#c", m.cuantizacion, {
          etiqueta: function (c) { return nombres[c.variante]; }, valor: function (c) { return c.mb; }, fmt: function (v) { return A.num(v) + " MB"; },
          tip: function (c) { return nombres[c.variante] + ": " + A.dec(c.mb, 1) + " MB · top-1 " + A.pct(c.top1); }
        });
        A.tabla("#t", [
          { t: "Versión", v: function (c) { return "<strong>" + nombres[c.variante] + "</strong>"; } },
          { t: "Top-1", v: function (c) { return A.pct(c.top1); }, n: true },
          { t: "Top-3", v: function (c) { return A.pct(c.top3); }, n: true }
        ], m.cuantizacion);
      },
      guia: ["Truco.", "Pasar de 32 a 16 bits deja el modelo en la mitad (" + A.num(q.fp16.mb) + " MB) y el acierto casi no cambia: " + A.pct(q.fp32.top1) + " frente a " + A.pct(q.fp16.top1) +
        ". Con 8 bits no se ahorra más espacio y sí se pierde: " + A.pct(q.int8.top1) + "."]
    }];
  }
});
