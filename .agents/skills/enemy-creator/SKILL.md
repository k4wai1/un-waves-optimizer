---
name: enemy-creator
description: Guía para crear o editar un enemigo de Wuthering Waves en formato JSON5, o scrapear enemigos desde encore.moe (API api-v2.encore.moe/api/en/monster/{Id}). Cubre metadata, stats (level/hp/atk/defense/resistencias elementales en decimal/damageReceived/damageReduction), el helper resolveEnemyStats del motor (escala DEF por nivel), y cómo descargar el ícono webp. Usar cuando el usuario pida añadir un enemigo nuevo, scrapear la lista de enemigos, editar un enemy, o convertir datos de encore.moe a formato JSON5.
---

# Enemy Creator

Guía para crear o editar un enemigo (`libs/ww/stats/src/enemies/*.json5`) sin tocar el motor,
y para scrapear enemigos desde **encore.moe** (la API oficial de esa base de datos).

## Flujo completo

1. Copiar plantilla o extraer de encore.moe
2. Metadata
3. Stats (nivel base 1, HP/ATK/DEF, resistencias en decimal)
4. Imagen (`.webp`)
5. Validar (parseo + `enemy.spec.ts`)

---

## 1. Extraer datos desde encore.moe (API)

Los enemigos de encore.moe se obtienen por su ID numérico:

```bash
# En el navegador (MCP chrome-devtools):
# https://encore.moe/monster/{Id}?lang=en  → lista de enemigos y stats
# API JSON estructurada:
# https://api-v2.encore.moe/api/en/monster/{Id}  → JSON completo
```

Campos clave de la API (para Calamity, `RarityId`):
- `Id`, `Name`, `RarityId` (4=Calamity, 3=Overlord, 2=Elite, 1=Standard)
- `Icon` (URL del ícono; convertir `api.encore.moe` → `api-v2.encore.moe` y `.png` → `.webp`)
- `ElementIdArray` (1=glacio, 2=fusion, 3=electro, 4=aero, 5=spectro, 6=havoc)
- `Properties`: `LifeMax`, `Atk`, `Def`, `HardnessMax` (Max Vibration), `RageMax`, y
  `DamageResistancePhys` / `DamageResistanceElement1-6` (**en base 10000**: 4000 → 0.40)
- `UndiscoveredDes` / `DiscoveredDes` (descripciones; a `DiscoveredDes` hay que quitarle el HTML)

> ⚠️ Algunas entidades Phantom/Reminiscence (p. ej. `350000360` Phantom: Sigillum) no reportan
> `Properties` en la API. Para esas, dejá `hp`/`atk`/`defense` por defecto (100000/100/800) y
> `elementalResistances` al 10%, manteniendo la descripción y el ícono reales.

## 2. Metadata

```json5
"metadata": {
  "schemaVersion": "2.0",
  "id": "340000020",      // usar el ID numérico de encore (único)
  "name": "Bell-Borne Geochelone",
  "entityType": "enemy",
  "rarity": 4,
  "rarityClass": "Calamity",  // Calamity | Overlord | Elite | Standard
  "version": "1.0",
  "element": "glacio",         // elemento del enemigo (o null)
  "weaponType": null,
  "icon": "340000020.webp",    // debe coincidir con el archivo en enemies/img/
  "tags": ["enemy", "calamity"],
  "aliases": []
}
```

## 3. Stats

```json5
"stats": {
  "level": 1,               // nivel base de las stats declaradas (por convención 1)
  "hp": 1611,               // HP base a level 1 (informativo; no entra en daño)
  "atk": 120,               // ATK base a level 1 (informativo)
  "defense": 800,           // DEF base a level 1. El motor escala: DEF = base + 8×(nivel-base)
  "elementalResistances": { "glacio": 0.40, "fusion": 0.10, "electro": 0.10, "aero": 0.10, "havoc": 0.10, "spectro": 0.10 },
  "physicalResistance": 0.10,
  "damageTaken": 1.0,       // multiplicador de daño recibido (1.0 = normal)
  "damageReduction": 0,     // M_DR del boss (0.15 = 15% de barrera)
  "maxVibration": 200000,   // Max Vibration Strength (informativo)
  "rageLimit": 161151       // Rage Limit (informativo)
}
```

- **Resistencias en decimal** (0.10 = 10%). El motor usa `M_RES` con estas.
- **DEF escalable**: `resolveEnemyStats(def, targetLevel)` computa `DEF = baseDef + 8×(target−baseLevel)`.
  Ej.: Bell-Borne baseDef 800 a Lv1 → a Lv100 = 1592.

## 4. Imagen

Descargar el ícono webp del enemigo a `libs/ww/stats/src/enemies/img/{id}.webp`:

```bash
curl -s -o libs/ww/stats/src/enemies/img/340000020.webp \
  "https://api-v2.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconMonsterHead/T_IconMonsterHead_992_UI.webp" \
  -A "Mozilla/5.0" -e "https://encore.moe/"
```

⚠️ `metadata.icon` debe coincidir con el nombre del archivo webp (`{id}.webp`), porque la UI
carga imágenes por ese nombre (`enemyImages[id]`).

## 5. Validar

1. Parseo JSON5 (usar json5, no JSON estándar; tolera comentarios/trailing commas).
2. Ejecutar los tests del motor:
   ```bash
   cd app/ww-frontend && npx vitest run src/engine/enemy.spec.ts
   ```
3. Abrir la app (`npm run dev`) → pestaña **Enemies** → el enemigo debe aparecer con imagen,
   stats, resistencias y descripción.

### Script de generación masiva (ya usado para los 20 Calamity)

`/tmp/gen-enemies.cjs` en este repo generó los 20 Calamity desde `/tmp/ww-monsters-calamity.json`
(extraído con `evaluate_script` del MCP). Para re-scrapear todos: fetch de
`https://api-v2.encore.moe/api/en/monster/{Id}` para cada Id, mapear `Properties` (resistencias
en ÷10000) y escribir el JSON5 con `id` = Id numérico.

## Ver también

- `app/ww-frontend/src/engine/enemy.ts` — `resolveEnemyStats`/`enemyInfo`
- `app/ww-frontend/src/engine/enemy.spec.ts` — tests
- `libs/ww/stats/src/enemies/EnemyBase.json5` — dummy de práctica (Training Dummy)
- `app/ww-frontend/src/pages/EnemiesSetup.tsx` — UI del menú de enemigos
- `.agents/skills/spec-validator/SKILL.md` — validación de specs
- `docs/engine-accuracy.md` — fórmula de daño / M_DEF/M_RES
