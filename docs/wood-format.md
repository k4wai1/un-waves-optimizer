# Formato WOOD (Wuthering Waves Object-Oriented Data)

> Formato de importacion/exportacion para compartir inventarios entre herramientas.
> Convertido desde `text/Estructura-General-del-Formato-WOOD.txt`.

## Estructura general

El objeto raiz contiene la version del formato, la fuente (herramienta de escaneo)
y tres arreglos principales: Resonators, Weapons y Echoes.

### Raiz (IWOOD)

| Campo | Tipo | Descripcion |
|---|---|---|
| `format` | string | `"WOOD"` (cadena estatica para validacion) |
| `version` | int | Version del formato para manejar migraciones |
| `source` | string | Ej. `"WuWaScanner"` |
| `resonators` | array | Lista de objetos IResonator |
| `weapons` | array | Lista de objetos IWeapon |
| `echoes` | array | Lista de objetos IEcho |

### Resonator (IResonator)

A diferencia de Genshin, en Wuthering Waves los talentos se dividen en un arbol (Forte).
Para la exportacion, se simplifica a los nodos principales.

| Campo | Tipo | Descripcion |
|---|---|---|
| `key` | string | Ej. `"RoverHavoc"`, `"Verina"` |
| `level` | int | 1-90 |
| `ascension` | int | 0-6 |
| `resonanceChain` | int | 0-6 (equivale a constelaciones) |
| `skills` | object | Niveles (1-10) de: `basic`, `skill`, `forte`, `liberation`, `intro` |

### Weapon (IWeapon)

| Campo | Tipo | Descripcion |
|---|---|---|
| `key` | string | Ej. `"EmeraldOfGenesis"` |
| `level` | int | 1-90 |
| `ascension` | int | 0-6 |
| `tuning` | int | 1-5 (rank del arma) |
| `location` | string | A quien pertenece |
| `lock` | bool | Bloqueado |

### Echo (IEcho)

| Campo | Tipo | Descripcion |
|---|---|---|
| `echoKey` | string | Ej. `"Dreamless"` |
| `setKey` | string | Ej. `"HavocEclipse"` |
| `cost` | int | 4 (Calamity), 3 (Elite), 1 (Common) |
| `rarity` | int | 5 (solo trabajamos con 5*) |
| `level` | int | 1-25 |
| `mainStatKey` | string | Ej. `"critRate_"`, `"havoc_dmg_"`. El `_` indica porcentaje |
| `substats` | array | Objetos con `key` y `value` |
| `location` | string | A quien pertenece |
| `lock` | bool | Bloqueado |

## Ejemplo de exportacion (WOOD.json)

```json
{
  "format": "WOOD",
  "version": 1,
  "source": "LuisAutoScanner",
  "resonators": [
    {
      "key": "RoverHavoc",
      "level": 90,
      "ascension": 6,
      "resonanceChain": 6,
      "skills": {
        "basic": 8,
        "skill": 10,
        "forte": 10,
        "liberation": 10,
        "intro": 8
      }
    }
  ],
  "weapons": [
    {
      "key": "EmeraldOfGenesis",
      "level": 90,
      "ascension": 6,
      "tuning": 1,
      "location": "RoverHavoc",
      "lock": true
    }
  ],
  "echoes": [
    {
      "echoKey": "Dreamless",
      "setKey": "HavocEclipse",
      "cost": 4,
      "rarity": 5,
      "level": 25,
      "mainStatKey": "critDMG_",
      "substats": [
        { "key": "critRate_", "value": 10.5 },
        { "key": "atk_", "value": 11.6 },
        { "key": "enerRech_", "value": 9.2 },
        { "key": "resonance_liberation_dmg_", "value": 10.1 },
        { "key": "atk", "value": 40 }
      ],
      "location": "RoverHavoc",
      "lock": true
    },
    {
      "echoKey": "Tambourinist",
      "setKey": "HavocEclipse",
      "cost": 3,
      "rarity": 5,
      "level": 25,
      "mainStatKey": "havoc_dmg_",
      "substats": [
        { "key": "critRate_", "value": 8.1 },
        { "key": "critDMG_", "value": 14.2 },
        { "key": "hp_", "value": 9.4 },
        { "key": "def", "value": 30 },
        { "key": "basic_attack_dmg_", "value": 8.6 }
      ],
      "location": "RoverHavoc",
      "lock": false
    }
  ]
}
```

## Consideraciones de diseno

Al importar WOOD a la base de datos interna del frontend, la aplicacion le inyecta
IDs unicos (`id: "echo_1"`, `id: "weapon_2"`) para referenciarlos en equipos, y
guarda el estado de configuraciones condicionales (ej. si el buff del Emerald of
Genesis esta activo con 1 o 2 stacks).

Para la capa de exportacion/importacion, esta estructura es todo lo que se necesita
para empezar a calcular dano.
