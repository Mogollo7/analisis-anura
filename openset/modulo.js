A.modulo({
  id: "openset",
  bajada: "Qué hace el modelo cuando ve una especie que nunca le enseñaron.",
  foto: ["phyllomedusa-tarsius", "Phyllomedusa tarsius"],
  guia: ["Resumen.", "Lo ideal sería que ante una especie nueva dijera «no la conozco». Hoy casi nunca lo dice. Recorre las tarjetas en orden para ver por qué y qué lo mejora."],
  datos: ["openset", "distribucion"],
  pasos: function (os, dist) {
    var c = os.configs, vis = c[0], dos = c[2], techo = c[3], t = dist.totales, rh = os.rhinella, dec = os.decisiones;
    var fuera = t.especies - t.especies_modelo, pct0 = function (v) { return A.pct(v, 0); }, d2 = function (v) { return A.dec(v, 2); };
    var nombre = { A: "A · Solo imagen", B: "B · Imagen + ubicación (peso 0,3)", C: "C · Dos etapas", D: "D · Ubicación fuerte (peso 0,9)" };
    var marina = os.desconocidas.filter(function (e) { return e.nombre === "Rhinella marina"; })[0];
    var suma = function (o) { return o.conocida + o.no_concluyente + o.incompatible; };

    return [{
      id: "problema", tarjeta: [fuera, "especies que el modelo no conoce"], t: "El problema",
      html: '<div class="dos"><div id="d"></div><ol class="tres"><li><div><b>AUROC</b><span>Qué tan bien separa conocidas de desconocidas. 0,5 es tirar una moneda; 1 es perfecto.</span></div></li>' +
        "<li><div><b>Falsa aceptación</b><span>Fotos de especies desconocidas que el modelo da por conocidas. Cuanto menos, mejor.</span></div></li></ol></div>",
      pinta: function () { A.dona("#d")(fuera / t.especies, "pct0", "del catálogo está <strong>fuera</strong> del modelo"); },
      guia: ["Resumen.", "El modelo conoce " + t.especies_modelo + " de " + t.especies + " especies. Con las otras <strong>" + fuera + "</strong> debería responder «no la conozco». Se probó con " +
        A.num(vis.n_unknown) + " fotos de " + os.desconocidas.length + " especies que nunca vio."]
    }, {
      id: "configuraciones", tarjeta: [pct0(vis.far) + " → " + pct0(dos.far), "desconocidas que se cuelan"], t: "Cuatro formas",
      plomo: "Cuatro maneras de puntuar, de menos a más peso de la ubicación.",
      html: '<div id="f"></div><figure class="g" style="margin-top:16px"><div id="c"></div><p class="g__pie" id="pie"></p></figure>',
      pinta: function () {
        A.fichas("#f", [["far", "Falsa aceptación"], ["auroc", "AUROC"]], function (v) {
          if (v === "far") {
            A.barras("#c", c, {
              etiqueta: function (f) { return nombre[f.config]; }, valor: function (f) { return f.far; }, max: 1, fmt: pct0,
              clase: function (f) { return f.config === "D" ? "r-trama" : "r-tinta"; },
              tip: function (f) { return nombre[f.config] + ": " + A.pct(f.far) + " de falsa aceptación" + (f.config === "D" ? " · techo optimista" : ""); }
            });
            document.getElementById("pie").textContent = "Menos es mejor. Todas rechazan por error el " + pct0(vis.frr) + " de las conocidas. La D va con trama porque es un techo, no un resultado.";
          } else {
            A.intervalos("#c", c, {
              etiqueta: function (f) { return nombre[f.config]; }, v: function (f) { return f.auroc; }, lo: function (f) { return f.auroc_lo; }, hi: function (f) { return f.auroc_hi; },
              min: 0.4, max: 0.8, ref: 0.5, fmt: d2
            });
            document.getElementById("pie").textContent = "Más es mejor. La franja es el intervalo de confianza del 95 %; la línea discontinua, el azar (0,5).";
          }
        });
      },
      guia: ["Ojo: la configuración D es un techo.", "Solo con imagen se cuelan el " + pct0(vis.far) + " de las desconocidas. La ubicación lo baja al " + pct0(dos.far) + ". El " + pct0(techo.far) +
        " de la D usa un <strong>oráculo</strong>: conoce de antemano la especie correcta, algo que en la práctica no se sabe."]
    }, {
      id: "dilema", tarjeta: [pct0(techo.top1), "acierto si se fuerza la ubicación"], t: "El dilema",
      plomo: "Dar mucho peso a la ubicación detecta más especies nuevas, pero estropea la identificación de las conocidas.",
      html: '<div id="t"></div>',
      pinta: function () {
        A.tabla("#t", [
          { t: "Configuración", v: function (f) { return "<strong>" + nombre[f.config] + "</strong>"; } },
          { t: "Acierto en conocidas", v: function (f) { return pct0(f.top1); }, n: true },
          { t: "Falsa aceptación", v: function (f) { return pct0(f.far); }, n: true },
          { t: "AUROC", v: function (f) { return d2(f.auroc); }, n: true }
        ], c);
      },
      guia: ["Para recordar.", "Con una sola puntuación y peso 0,9, el acierto en conocidas cae al <strong>" + pct0(techo.top1) + "</strong>. Las <strong>dos etapas</strong> lo evitan: primero ordenan con peso 0,3 (acierto " +
        pct0(dos.top1) + ") y después deciden con peso 0,9 si es desconocida."]
    }, {
      id: "especies", tarjeta: [os.desconocidas.length, "especies desconocidas, una a una"], t: "Por especie",
      plomo: "Qué parte de las fotos de cada especie desconocida se detecta como tal.",
      html: '<figure class="g">' + A.leyenda([["r-hueco", "Solo imagen"], ["r-tinta", "Ubicación fuerte (techo)"]]) + '<div id="c"></div></figure>',
      pinta: function () {
        A.pares("#c", os.desconocidas, {
          etiqueta: function (e) { return A.sp(e.nombre); }, a: function (e) { return e.detectada_visual; }, b: function (e) { return e.detectada_geo; },
          tip: function (e) { return " · " + e.n + " fotos"; }
        });
      },
      guia: ["¿Sabías?", "La ubicación casi resuelve " + A.sp(os.desconocidas[0].nombre) + " (de " + pct0(os.desconocidas[0].detectada_visual) + " a " + pct0(os.desconocidas[0].detectada_geo) +
        ") y apenas mueve las demás. Fíjate en la que queda pegada al cero."]
    }, {
      id: "rhinella", tarjeta: [d2(rh.visual.solo_marina), "AUROC de Rhinella marina: peor que el azar"], t: "Rhinella marina",
      html: '<div class="dos"><figure class="foto" style="aspect-ratio:3/2"><img src="../assets/fotos/rhinella-horribilis.jpg" alt="Sapo Rhinella horribilis, casi idéntico a Rhinella marina" loading="lazy">' +
        "<figcaption>Su gemela en el catálogo: <em>Rhinella horribilis</em></figcaption></figure><div>" +
        A.cifras([[marina.detectada_visual, "pct", "de sus " + rh.n_marina + " fotos se detectan como desconocidas"]]) + '<div id="t"></div></div></div>',
      pinta: function () {
        A.tabla("#t", [
          { t: "AUROC", v: function (f) { return "<strong>" + f[0] + "</strong>"; } },
          { t: "Las 7 especies", v: function (f) { return d2(f[1].todas); }, n: true },
          { t: "Sin <em>R. marina</em>", v: function (f) { return d2(f[1].sin_marina); }, n: true },
          { t: "Solo ella", v: function (f) { return d2(f[1].solo_marina); }, n: true }
        ], [["Solo imagen", rh.visual], ["Ubicación fuerte", rh.geo]]);
      },
      guia: ["Cuidado. Esta especie tira de la cifra hacia abajo.", A.sp("R. marina") + " y " + A.sp("R. horribilis") + " son casi idénticas a la vista y se trataron mucho tiempo como una sola. Como " + A.sp("R. horribilis") +
        " sí está en el catálogo, el modelo ve un sapo que conoce muy bien y lo acepta. Sin ella, el AUROC sube de " + d2(rh.visual.todas) + " a " + d2(rh.visual.sin_marina) + ".", "sorpresa"]
    }, {
      id: "estados", tarjeta: ["3", "respuestas posibles en vez de sí o no"], t: "Tres estados",
      plomo: "La propuesta de dos etapas no responde sí o no: reparte las fotos en tres estados.",
      html: '<figure class="g"><div id="c"></div></figure>',
      pinta: function () {
        A.apilada("#c", [{ etiqueta: "Fotos conocidas", v: dec.conocidas }, { etiqueta: "Fotos desconocidas", v: dec.desconocidas }],
          { segmentos: [["conocida", "Especie conocida", "r-tinta"], ["no_concluyente", "No concluyente", "r-trama"], ["incompatible", "Incompatible con la zona", "r-gris"]] });
      },
      guia: ["Ojo: umbrales de diagnóstico.", "Solo el " + pct0(dec.desconocidas.conocida / suma(dec.desconocidas)) + " de las desconocidas se aceptan por error, pero también solo el " +
        pct0(dec.conocidas.conocida / suma(dec.conocidas)) + " de las conocidas se confirman. Los umbrales se ajustaron con las mismas fotos de la prueba: sirven para entender, no para producción."]
    }, {
      id: "reducirlo", tarjeta: ["3", "acciones para reducirlo"], t: "Cómo reducirlo",
      html: '<div class="acciones"><div class="accion" style="--i:0"><b>1</b><h3>Usar la ubicación</h3><p>Lo único medido que baja la falsa aceptación: de ' + pct0(vis.far) + " a " + pct0(dos.far) + ".</p></div>" +
        '<div class="accion" style="--i:1"><b>2</b><h3>Decidir en dos etapas</h3><p>Así la detección no se paga con el acierto: se mantiene en ' + pct0(dos.top1) + ".</p></div>" +
        '<div class="accion" style="--i:2"><b>3</b><h3>Calibrar con más fotos</h3><p>Con 17 fotos desconocidas no se puede fijar un umbral fiable.</p></div></div>',
      guia: ["Truco (extra).", "Esto ya no es medición, es proyección: cada especie que entra al catálogo deja de ser desconocida, así que pasar de " + t.especies_modelo + " hacia " + t.especies +
        " reduce el problema de raíz. Y para gemelas como las dos " + A.sp("Rhinella") + " hará falta otra señal, como el canto."]
    }];
  }
});
