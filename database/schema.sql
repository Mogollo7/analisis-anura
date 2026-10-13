-- Esquema ACID del análisis. Las restricciones CHECK son la validación:
-- si una fila no cumple, la transacción de carga entera se revierte.
PRAGMA foreign_keys = ON;

CREATE TABLE especie_catalogo (
  taxon_id       TEXT PRIMARY KEY,
  nombre         TEXT NOT NULL UNIQUE,
  familia        TEXT NOT NULL,
  genero         TEXT NOT NULL,
  registros_gbif INTEGER NOT NULL CHECK (registros_gbif >= 0)
);

CREATE TABLE modelo_especie (
  nombre    TEXT PRIMARY KEY REFERENCES especie_catalogo(nombre),
  n_test    INTEGER NOT NULL CHECK (n_test > 0),
  n_train   INTEGER NOT NULL CHECK (n_train >= 0),
  top1      REAL NOT NULL CHECK (top1 BETWEEN 0 AND 1),
  top3      REAL NOT NULL CHECK (top3 BETWEEN 0 AND 1 AND top3 >= top1),
  f1        REAL NOT NULL CHECK (f1 BETWEEN 0 AND 1),
  precision REAL NOT NULL CHECK (precision BETWEEN 0 AND 1),
  recall    REAL NOT NULL CHECK (recall BETWEEN 0 AND 1)
);

CREATE TABLE par_confundible (
  especie_a   TEXT NOT NULL REFERENCES modelo_especie(nombre),
  especie_b   TEXT NOT NULL REFERENCES modelo_especie(nombre),
  confusiones INTEGER NOT NULL CHECK (confusiones > 0),
  PRIMARY KEY (especie_a, especie_b),
  CHECK (especie_a <> especie_b)
);

CREATE TABLE cuantizacion (
  variante TEXT PRIMARY KEY,
  top1     REAL NOT NULL CHECK (top1 BETWEEN 0 AND 1),
  top3     REAL NOT NULL CHECK (top3 BETWEEN 0 AND 1),
  mb       REAL NOT NULL CHECK (mb > 0)
);

CREATE TABLE prior_barrido (
  peso REAL PRIMARY KEY CHECK (peso >= 0),
  top1 REAL NOT NULL CHECK (top1 BETWEEN 0 AND 1),
  top3 REAL NOT NULL CHECK (top3 BETWEEN 0 AND 1)
);

CREATE TABLE ranking_especie (
  w_geo   REAL NOT NULL CHECK (w_geo BETWEEN 0 AND 1),
  nombre  TEXT NOT NULL,
  genero  TEXT NOT NULL,
  familia TEXT NOT NULL,
  n       INTEGER NOT NULL CHECK (n > 0),
  top1    REAL NOT NULL CHECK (top1 BETWEEN 0 AND 1),
  PRIMARY KEY (w_geo, nombre)
);

CREATE TABLE openset_config (
  config    TEXT PRIMARY KEY,
  w_geo     REAL NOT NULL CHECK (w_geo BETWEEN 0 AND 1),
  top1      REAL NOT NULL CHECK (top1 BETWEEN 0 AND 1),
  auroc     REAL NOT NULL CHECK (auroc BETWEEN 0 AND 1),
  auroc_lo  REAL NOT NULL,
  auroc_hi  REAL NOT NULL,
  far       REAL NOT NULL CHECK (far BETWEEN 0 AND 1),
  frr       REAL NOT NULL CHECK (frr BETWEEN 0 AND 1),
  n_known   INTEGER NOT NULL CHECK (n_known > 0),
  n_unknown INTEGER NOT NULL CHECK (n_unknown > 0),
  CHECK (auroc_lo <= auroc AND auroc <= auroc_hi)
);

CREATE TABLE openset_muestra (
  id        INTEGER PRIMARY KEY,
  sample_id TEXT NOT NULL,  -- una observación puede tener varias fotos
  pool      TEXT NOT NULL CHECK (pool IN ('KNOWN', 'UNKNOWN')),
  nombre    TEXT NOT NULL,
  score_visual REAL NOT NULL CHECK (score_visual >= 0),
  score_geo    REAL NOT NULL CHECK (score_geo >= 0)
);

-- Diagnóstico de centroides (24 especies con conjunto limpio). Distancias euclídeas entre vectores L2.
CREATE TABLE centroide_especie (
  nombre        TEXT PRIMARY KEY,
  genero        TEXT NOT NULL,
  familia       TEXT NOT NULL,
  n             INTEGER NOT NULL CHECK (n > 0),
  dispersion    REAL NOT NULL CHECK (dispersion > 0),      -- distancia media entre fotos de la especie
  vecina        TEXT NOT NULL,
  dist_vecina   REAL NOT NULL CHECK (dist_vecina > 0),     -- distancia al centroide más cercano
  frac_margen_negativo REAL NOT NULL CHECK (frac_margen_negativo BETWEEN 0 AND 1),
  x             REAL NOT NULL,                              -- proyección PCA, solo para dibujar
  y             REAL NOT NULL,
  CHECK (vecina <> nombre)
);

CREATE TABLE separacion_taxonomica (
  relacion TEXT PRIMARY KEY CHECK (relacion IN ('same_genus', 'same_family_diff_genus', 'diff_family')),
  n_pares  INTEGER NOT NULL CHECK (n_pares > 0),
  media    REAL NOT NULL CHECK (media > 0),
  minimo   REAL NOT NULL,
  maximo   REAL NOT NULL,
  CHECK (minimo <= media AND media <= maximo)
);
