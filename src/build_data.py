"""Carga ACID: fuentes de Anura -> SQLite (una transacción) -> JSON para la web.

    python src/build_data.py            # usa D:\\Anura
    ANURA_DIR=/otra/ruta python src/build_data.py

Atomicidad: todo entra en una sola transacción; si una fila viola un CHECK o una
comprobación falla, se hace ROLLBACK y no se toca ni la base ni los JSON publicados.
Los archivos finales se escriben a un temporal y se renombran (os.replace).
"""
import csv
import json
import os
import sqlite3
import sys
from pathlib import Path

import numpy as np  # solo para leer los centroides (.npz) y proyectarlos a 2D

RAIZ = Path(__file__).resolve().parent.parent
ANURA = Path(os.environ.get("ANURA_DIR", r"D:\Anura"))
GEO = ANURA / "validation" / "fase23a_geographic_context"
EVAL = ANURA / "bioclip" / "evaluation"
F19 = ANURA / "validation" / "fase19_embedding_separability"
RHINELLA = ("Rhinella horribilis", "Rhinella marina")


def lee_json(ruta):
    return json.loads(Path(ruta).read_text(encoding="utf-8"))


def lee_csv(ruta):
    with open(ruta, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def limpio(nombre):
    return nombre.replace("_", " ").strip()


def auroc(desconocidas, conocidas):
    """P(score desconocida > score conocida), con empates a 0,5 (Mann-Whitney)."""
    todo = sorted([(s, 1) for s in desconocidas] + [(s, 0) for s in conocidas])
    suma, i = 0.0, 0
    while i < len(todo):
        j = i
        while j < len(todo) and todo[j][0] == todo[i][0]:
            j += 1
        rango = (i + 1 + j) / 2  # rango medio del grupo empatado
        suma += rango * sum(t[1] for t in todo[i:j])
        i = j
    n1, n0 = len(desconocidas), len(conocidas)
    return (suma - n1 * (n1 + 1) / 2) / (n1 * n0)


def spearman(a, b):
    """Correlación de rangos (con empates)."""
    def rangos(v):
        orden, r, i = sorted(range(len(v)), key=v.__getitem__), [0.0] * len(v), 0
        while i < len(orden):
            j = i
            while j < len(orden) and v[orden[j]] == v[orden[i]]:
                j += 1
            for k in range(i, j):
                r[orden[k]] = (i + j - 1) / 2
            i = j
        return r
    ra, rb = rangos(a), rangos(b)
    ma, mb = sum(ra) / len(ra), sum(rb) / len(rb)
    cov = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    return cov / (sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb)) ** 0.5


def cargar(db):
    """Inserta todas las fuentes. Se llama dentro de la transacción."""
    gbif = lee_json(ANURA / "COLOMBIA_ANURA/cache/gbif_facet_nacional_CO_anura.json")
    for t in lee_csv(ANURA / "COLOMBIA_ANURA/taxonomy/taxonomy_guide.csv"):
        db.execute(
            "INSERT INTO especie_catalogo VALUES (?,?,?,?,?)",
            (t["taxon_id"], t["scientific_name"].strip(), t["family"] or "Sin familia",
             t["genus"], gbif["counts"].get(t["gbif_species_key"], 0)),
        )

    f5 = lee_json(EVAL / "fase_5_completa.json")
    for e in f5["por_especie"]:
        db.execute(
            "INSERT INTO modelo_especie VALUES (?,?,?,?,?,?,?,?)",
            (limpio(e["especie"]), e["n_test"], e["n_individuos_train_reales"],
             e["top1"], e["top3"], e["f1"], e["precision"], e["recall"]),
        )
    for p in f5["pares_confundibles"]:
        db.execute("INSERT INTO par_confundible VALUES (?,?,?)",
                   (limpio(p["especie_a"]), limpio(p["especie_b"]), p["confusiones"]))

    for variante, v in lee_json(EVAL / "comparacion_precisiones.json").items():
        db.execute("INSERT INTO cuantizacion VALUES (?,?,?,?)",
                   (variante, v["top1"], v["top3"], v["mb"]))

    prior = lee_json(EVAL / "prior_geografico.json")
    for b in prior["barrido"]:
        db.execute("INSERT INTO prior_barrido VALUES (?,?,?)", (b["peso"], b["top1"], b["top3"]))

    for r in lee_csv(GEO / "GEO6_ranking_by_species.csv"):
        db.execute("INSERT INTO ranking_especie VALUES (?,?,?,?,?,?)",
                   (r["w_geo_rank"], limpio(r["species"]), r["genus"], r["family"], r["n"], r["top1_acc"]))

    g6 = lee_json(GEO / "GEO6_COMPARISON_SUMMARY.json")
    for clave, bloque in (
        ("A_visual_only", "openset"),
        ("B_ranking_plus_geo_best_w", "openset_using_ranking_score_directly"),
        ("C_two_stage", "openset_separate_gate"),
        ("D_geo2_original_single_score_w0.9", "openset"),
    ):
        o = g6[clave][bloque]
        rk = g6[clave].get("ranking") or g6[clave]["ranking_using_same_score"]
        db.execute("INSERT INTO openset_config VALUES (?,?,?,?,?,?,?,?,?,?)",
                   (clave[0], o["w_geo"], rk["top1_acc"], o["AUROC"], o["AUROC_ci_lo"], o["AUROC_ci_hi"],
                    o["FAR"], o["FRR"], o["n_known"], o["n_unknown"]))

    for m in lee_csv(GEO / "GEO4_per_sample_results.csv"):
        db.execute("INSERT INTO openset_muestra VALUES (NULL,?,?,?,?,?)",
                   (m["sample_id"], m["pool"], limpio(m["true_species"]), m["score_A"], m["score_B"]))
    # centroides: PCA de los 24 centroides (512 dimensiones) a 2D para poder dibujarlos
    npz = np.load(F19 / "_intermediate_for_plots.npz", allow_pickle=True)
    centrados = npz["centroids"] - npz["centroids"].mean(axis=0)
    u, sv, _ = np.linalg.svd(centrados, full_matrices=False)
    xy = dict(zip((limpio(str(n)) for n in npz["species_list"]), (u[:, :2] * sv[:2]).tolist()))
    varianza = (sv[:2] ** 2 / (sv ** 2).sum()).tolist()
    margen = {limpio(r["species"]): r["fraction_negative_margin"] for r in lee_csv(F19 / "species_separation_report.csv")}
    for c in lee_csv(F19 / "centroid_diagnostics.csv"):
        nombre = limpio(c["species"])
        db.execute("INSERT INTO centroide_especie VALUES (?,?,?,?,?,?,?,?,?,?)",
                   (nombre, c["genus"], c["family"], c["n_samples"], c["intra_species_dist_mean"],
                    limpio(c["nearest_species"]), c["distance_to_nearest_species"], margen[nombre], *xy[nombre]))
    for t in lee_csv(F19 / "taxonomy_separability_report.csv"):
        db.execute("INSERT INTO separacion_taxonomica VALUES (?,?,?,?,?)",
                   (t["relation"], t["n_pairs"], t["mean_centroid_distance"], t["min"], t["max"]))
    return f5, prior, g6, varianza


def filas(db, sql, *args):
    cur = db.execute(sql, args)
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, f)) for f in cur]


def uno(db, sql, *args):
    return db.execute(sql, args).fetchone()[0]


def derivar(db, f5, prior, g6, varianza):
    """Consultas sobre la base ya cargada -> un dict por archivo JSON."""
    # --- distribución
    especies = filas(db, """
        SELECT c.nombre, c.familia, c.genero, c.registros_gbif AS registros,
               m.nombre IS NOT NULL AS en_modelo
        FROM especie_catalogo c LEFT JOIN modelo_especie m USING (nombre)
        ORDER BY registros DESC""")
    total_reg = sum(e["registros"] for e in especies)
    reg_modelo = sum(e["registros"] for e in especies if e["en_modelo"])
    distribucion = {
        "totales": {
            "especies": len(especies),
            "familias": uno(db, "SELECT COUNT(DISTINCT familia) FROM especie_catalogo WHERE familia <> 'Sin familia'"),
            "registros": total_reg,
            "registros_modelo": reg_modelo,
            "especies_modelo": uno(db, "SELECT COUNT(*) FROM modelo_especie"),
            "especies_menos_100": sum(1 for e in especies if e["registros"] < 100),
            "fecha_gbif": lee_json(ANURA / "COLOMBIA_ANURA/cache/gbif_facet_nacional_CO_anura.json")["fetched_on"],
        },
        "familias": filas(db, """
            SELECT c.familia, COUNT(*) AS especies, SUM(c.registros_gbif) AS registros,
                   COUNT(m.nombre) AS en_modelo
            FROM especie_catalogo c LEFT JOIN modelo_especie m USING (nombre)
            GROUP BY c.familia ORDER BY especies DESC"""),
        "especies": especies,
    }

    # --- modelo cerrado (41 especies)
    def top1_ponderado(excluir=()):
        marcas = ",".join("?" * len(excluir)) or "''"
        return uno(db, f"SELECT SUM(top1*n_test)/SUM(n_test) FROM modelo_especie WHERE nombre NOT IN ({marcas})", *excluir)

    esp_modelo = filas(db, """
        SELECT m.*, c.familia, c.genero, c.registros_gbif AS registros,
               COUNT(*) OVER (PARTITION BY c.genero) AS congeneres
        FROM modelo_especie m JOIN especie_catalogo c USING (nombre) ORDER BY top1 DESC""")
    top1s = [e["top1"] for e in esp_modelo]
    modelo = {
        "meta": {**f5["meta"], "top1_sin_horribilis": top1_ponderado(("Rhinella horribilis",)),
                 "spearman_train": spearman([e["n_train"] for e in esp_modelo], top1s),
                 "spearman_congeneres": spearman([e["congeneres"] for e in esp_modelo], top1s)},
        "especies": esp_modelo,
        "generos": filas(db, """
            SELECT c.genero, COUNT(*) AS especies, SUM(m.n_test) AS n_test,
                   SUM(m.top1 * m.n_test) / SUM(m.n_test) AS top1
            FROM modelo_especie m JOIN especie_catalogo c USING (nombre)
            GROUP BY c.genero ORDER BY especies DESC, top1 DESC"""),
        "pares": filas(db, "SELECT * FROM par_confundible ORDER BY confusiones DESC LIMIT 12"),
        "cuantizacion": filas(db, "SELECT * FROM cuantizacion ORDER BY mb DESC"),
        "horribilis": filas(db, "SELECT * FROM modelo_especie WHERE nombre = 'Rhinella horribilis'")[0],
    }

    # --- mejora con geografía
    mejora = {
        "prior": {
            "cobertura": prior["cobertura"],
            "config": prior["config"],
            "barrido": filas(db, "SELECT * FROM prior_barrido ORDER BY peso"),
            "mejor": prior["mejor"],
            "distancia": prior["curva_por_distancia"],
        },
        "ranking": {
            "n": g6["A_visual_only"]["openset"]["n_known"],
            "visual": g6["A_visual_only"]["ranking"],
            "geo": g6["C_two_stage"]["ranking"],
            "w_geo": g6["C_two_stage"]["w_geo_rank"],
            "especies": filas(db, """
                SELECT a.nombre, a.familia, a.n, a.top1 AS top1_visual, b.top1 AS top1_geo
                FROM ranking_especie a JOIN ranking_especie b USING (nombre)
                WHERE a.w_geo = 0 AND b.w_geo = 0.3 ORDER BY b.top1 - a.top1 DESC"""),
        },
    }

    # --- open set
    def scores(col, pool, excluir=()):
        marcas = ",".join("?" * len(excluir)) or "''"
        return [f[0] for f in db.execute(
            f"SELECT {col} FROM openset_muestra WHERE pool = ? AND nombre NOT IN ({marcas})", (pool, *excluir))]

    def par_auroc(col):
        con = scores(col, "KNOWN")
        return {"todas": auroc(scores(col, "UNKNOWN"), con),
                "sin_marina": auroc(scores(col, "UNKNOWN", ("Rhinella marina",)), con),
                "solo_marina": auroc([f[0] for f in db.execute(
                    f"SELECT {col} FROM openset_muestra WHERE nombre = 'Rhinella marina'")], con)}

    g4 = lee_json(GEO / "GEO4_openset_comparison.json")["variants"]
    umbral_v, umbral_g = g4["A_visual_only"]["threshold"], g4["B_visual_plus_geo_species"]["threshold"]
    dec = lee_json(GEO / "GEO6_OPENSET_DECISION_SUMMARY.json")

    def decisiones(cuentas):
        # las claves originales son frases largas; se reducen a tres estados
        salida = {"conocida": 0, "no_concluyente": 0, "incompatible": 0}
        for clave, n in cuentas.items():
            if clave == "ESPECIE_CONOCIDA":
                salida["conocida"] += n
            elif clave == "NO_CONCLUYENTE":
                salida["no_concluyente"] += n
            else:
                salida["incompatible"] += n
        return salida

    openset = {
        "configs": filas(db, "SELECT * FROM openset_config ORDER BY config"),
        "umbrales": {"bajo": dec["THR_LOW_FAR_le_5pct"], "alto": dec["THR_HIGH_FAR_le_30pct"], "estado": dec["status"]},
        "decisiones": {"conocidas": decisiones(dec["known_set_decision_counts"]),
                       "desconocidas": decisiones(dec["unknown_set_decision_counts"])},
        "desconocidas": filas(db, """
            SELECT nombre, COUNT(*) AS n,
                   AVG(score_visual >= ?) AS detectada_visual, AVG(score_geo >= ?) AS detectada_geo
            FROM openset_muestra WHERE pool = 'UNKNOWN' GROUP BY nombre ORDER BY n DESC""", umbral_v, umbral_g),
        "rhinella": {"visual": par_auroc("score_visual"), "geo": par_auroc("score_geo"),
                     "n_marina": uno(db, "SELECT COUNT(*) FROM openset_muestra WHERE nombre = 'Rhinella marina'")},
    }

    # --- centroides: se cruzan con el top-1 solo imagen de la misma evaluación (mismas 24 especies)
    esp_cen = filas(db, """
        SELECT c.*, c.dist_vecina / c.dispersion AS separacion, r.top1 AS top1_visual, g.top1 AS top1_geo
        FROM centroide_especie c
        JOIN ranking_especie r ON r.nombre = c.nombre AND r.w_geo = 0
        JOIN ranking_especie g ON g.nombre = c.nombre AND g.w_geo = 0.3
        ORDER BY separacion""")
    tops = [e["top1_visual"] for e in esp_cen]
    diag = lee_json(F19 / "diagnostic_metrics.json")
    centroides = {
        "especies": esp_cen,
        "taxonomia": filas(db, "SELECT * FROM separacion_taxonomica ORDER BY media"),
        "varianza_pca": varianza,
        "spearman_separacion": spearman([e["separacion"] for e in esp_cen], tops),
        "spearman_margen": spearman([e["frac_margen_negativo"] for e in esp_cen], tops),
        "spearman_n": spearman([e["n"] for e in esp_cen], tops),
        "margen_negativo_medio": diag["hypothesis_evidence"]["encoder_separability"]["mean_fraction_negative_margin_across_species"],
    }
    assert len(esp_cen) == 24, "faltan especies al cruzar centroides con el ranking"

    # --- comprobaciones: lo recalculado debe coincidir con lo publicado en las fuentes
    assert abs(top1_ponderado() - f5["meta"]["top1_global"]) < 1e-9, "top-1 global no cuadra"
    assert abs(openset["rhinella"]["visual"]["todas"] - g4["A_visual_only"]["AUROC"]) < 1e-6, "AUROC visual no cuadra"
    assert abs(openset["rhinella"]["geo"]["todas"] - g4["B_visual_plus_geo_species"]["AUROC"]) < 1e-6, "AUROC geo no cuadra"
    assert not any(e["nombre"] in RHINELLA for e in openset["desconocidas"]) or openset["rhinella"]["n_marina"] > 0
    return {"distribucion": distribucion, "modelo": modelo, "mejora": mejora, "openset": openset, "centroides": centroides}


def main():
    destino_db = RAIZ / "database" / "anura_acid.db"
    tmp_db = destino_db.with_suffix(".tmp")
    tmp_db.unlink(missing_ok=True)
    db = sqlite3.connect(tmp_db, isolation_level=None)  # transacciones manuales
    try:
        db.executescript((RAIZ / "database" / "schema.sql").read_text(encoding="utf-8"))
        db.execute("BEGIN IMMEDIATE")
        salidas = derivar(db, *cargar(db))
        db.execute("COMMIT")
    except Exception as error:
        db.rollback()
        db.close()
        tmp_db.unlink(missing_ok=True)
        sys.exit(f"ROLLBACK: no se publicó nada. {type(error).__name__}: {error}")
    db.close()

    (RAIZ / "data").mkdir(exist_ok=True)
    for nombre, contenido in salidas.items():
        final = RAIZ / "data" / f"{nombre}.json"
        tmp = final.with_suffix(".tmp")
        tmp.write_text(json.dumps(contenido, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        os.replace(tmp, final)
    os.replace(tmp_db, destino_db)
    print("COMMIT:", ", ".join(f"{k}.json" for k in salidas), "+ database/anura_acid.db")


if __name__ == "__main__":
    main()
