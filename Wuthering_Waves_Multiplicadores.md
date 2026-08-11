# Calculadora de Daño en Wuthering Waves: Guía Objetiva de Multiplicadores

El cálculo de daño en *Wuthering Waves* se desglosa en una serie de grupos multiplicativos. Entender estos multiplicadores es clave para optimizar las *builds* y rotaciones de los personajes (Resonators). A continuación, explicamos cada componente de la **Ecuación de Daño Final**, contrastada con las mecánicas del juego y la información recopilada por la comunidad.

---

## La Ecuación de Daño Final

La fórmula principal se puede resumir en tres grandes bloques que se multiplican entre sí: **Daño Base**, **Multiplicadores del Enemigo** y **Multiplicadores del Jugador**.

$$D_{final} = (S \cdot MV + D_{flat} + D_{bonus}) \times (M_{RES} \times M_{DEF} \times M_{DR} \times M_{ER}) \times (1 + \sum B_i) \times (1 + \sum A_j) \times (1 + \sum P_k) \times M_{crit}$$

---

## 1. El Daño Base ($S \cdot MV + D_{flat} + D_{bonus}$)

El primer paso es calcular el daño en bruto antes de aplicar reducciones o bonos porcentuales.

* **S (Scaling Stat / Estadística de Escalado):** Es la estadística base que utiliza la habilidad (generalmente ATK, pero puede ser HP o DEF dependiendo del personaje).
    * *Fórmula:* `((Base Personaje + Base Arma) * (1 + Bono %)) + Bono Plano`.
    * *Nota:* Las ventajas porcentuales (ej. ATK +18%) siempre se multiplican únicamente sobre el valor **Base** (la suma natural de las estadísticas base del Personaje y su Arma), no sobre el total.
* **MV (Motion Value / Valor de Movimiento):** Es el porcentaje de daño que indica la habilidad en sí (por ejemplo, un golpe que dice "inflige un 150% del ATK").
* **$D_{flat}$ y $D_{bonus}$:** Cualquier fuente adicional de daño plano o bono fijo sumado antes del resto de multiplicadores.

---

## 2. Multiplicadores del Enemigo (Mitigación)

Este grupo reduce el daño que le haces al objetivo. Como jugador, buscas que estos números se acerquen lo máximo posible a `1.0` (o que lo superen mediante reducción de resistencias).

### Multiplicador de Defensa ($M_{DEF}$)
La defensa del enemigo se mitiga en relación a la diferencia de niveles entre el atacante y el defensor.
* **Fórmula:** `(800 + 8 \times L_c) / [800 + 8 \times L_c + (800 + 8 \times L_e) \times (1 - \delta)]`
    * $L_c$: Nivel de tu personaje.
    * $L_e$: Nivel del enemigo.
    * $\delta$: Penetración o Ignorar Defensa (DEF Ignore).
* *Análisis:* A niveles iguales ($L_c = L_e$) y sin Ignorar Defensa, el multiplicador resultante es exactamente **0.5 (es decir, el enemigo reduce tu daño base a la mitad)**.
* **Ejemplos de Kit:** Habilidades o efectos especiales en ciertos *Resonators* o *Echoes* de alto coste que ofrezcan estadística de Ignorar Defensa impactan directamente aquí, haciendo una diferencia masiva contra jefes de alto nivel (como en la *Tower of Adversity*).

### Multiplicador de Resistencia ($M_{RES}$)
Calcula la resistencia elemental base del enemigo y se le resta tu Penetración de Resistencia ($R_{PEN}$). Se define $R = R_0 - R_{PEN}$. Hay tres fórmulas dependiendo de en qué estado dejes al enemigo:
1.  **Resistencia Negativa ($R < 0$):** `1 - (R / 2)`. Si bajas la resistencia por debajo de cero, la penalización a favor del jugador se reduce a la mitad. Es decir, pasar a un enemigo de -10% a -20% solo aporta un aumento real de daño del 5%.
2.  **Resistencia Normal ($0 \leq R < 0.8$):** `1 - R`. Lo más estándar. Si un enemigo tiene 10% de resistencia, el multiplicador es 0.9.
3.  **Alta Resistencia ($R \geq 0.8$):** `1 / (1 + 5R)`. Fórmula que entra en juego contra entidades inmunes o híper resistentes a cierto elemento.

### Multiplicador de Reducción de Daño ($M_{DR}$) y Elemento ($M_{ER}$)
$M_{ER}$ (Elemento) **es sinónimo de $M_{RES}$** (resistencia elemental): no hay un
término separado; la resistencia ya cubre el rol con la fórmula de 3 ramas de arriba.

$M_{DR}$ (Reducción de Daño) es una **barrera absoluta** propia de los jefes, separada
y multiplicativa de $M_{RES}$, $M_{DEF}$ y del daño recibido:

$$M_{DR} = \max(0,\ 1 - \text{dmgReduction})$$

- $\text{dmgReduction}$ en decimal (0.15 = 15%).
- Las fuentes de DR se suman aditivamente antes de aplicar el multiplicador (15% ToA
  + 35% Taoqi + ... → DR_total = suma). Sin cap documentado.
- Ejemplos reales: ToA floors 3-4 → 15% DR (M_DR = 0.85); Bell-Borne Geochelone → 50% DR.
- Se aplica al final de la cadena multiplicativa, junto a $M_{DEF}$ / $M_{RES}$ / daño recibido.

---

## 3. Multiplicadores del Jugador (Potenciadores)

Aquí recae la mayoría del esfuerzo a la hora de armar y combinar *Resonators*. Entender cómo se acumulan es esencial.

### Bono de Daño Aditivo ($1 + \sum B_i$)
En esta bolsa o categoría caen **todos** los bonos que tengan la coletilla "DMG Bonus %".
* **Se suman entre sí antes de multiplicar:** Esto incluye Bono de Daño Elemental (ej. Electro DMG Bonus), Bono de Ataque Básico, Ataque Pesado, Habilidad de Resonancia, etc.
* *Dilución:* Al sumarse juntos en lugar de multiplicarse, si apilas demasiado Bono de Daño (por ejemplo un Eco de 3 costes con Bono Aero, otro con Bono Aero y buffs adicionales), cada porción extra tendrá un rendimiento decreciente (menor impacto real) respecto a invertir en otras estadísticas.

### Amplificación / Profundización (Amplify / Deepen) ($1 + \sum A_j$)
Esta es una categoría **totalmente separada y multiplicativa** respecto al daño aditivo estándar. Por eso los multiplicadores de *Deepen* en las *Outro Skills* son tan importantes en el metajuego.
* **Ejemplos Reales de Kits de Personajes:**
    * **Verina (Outro Skill - Blossom):** Otorga un 15% de "All Type DMG Deepen" (Profundiza el Daño de Todos los Tipos) para el equipo por 30s. Esto multiplica toda la ecuación de daño final x1.15.
    * **Mortefi (Outro Skill - Rage Awakening):** Otorga un 38% de "Heavy Attack DMG Deepen". Lo hace el support estrella para personajes DPS enfocados en ataques pesados, como **Jiyan**.
    * **Yinlin (Outro Skill - Strategist):** Otorga un 20% de "Electro DMG Deepen" y 25% de "Resonance Liberation DMG Deepen". Esto la convierte en la compañera obligatoria para DPS Electro dependientes de la definitiva, como **Calcharo** o **Xiangli Yao**.
    * **Sanhua (Outro Skill - Clarity of Mind):** Otorga un 38% de "Basic Attack DMG Deepen". Fantástica para DPS centrados en básicos como **Encore**.

### Bonos Especiales de Daño ($P_k$)
Modificadores multiplicativos extremadamente raros y específicos de ciertas mecánicas que no entran ni en *Damage Bonus* ni en *Deepen*. 

---

## 4. Daño Crítico y Daño Esperado

### Multiplicador Crítico ($M_{crit}$)
En *Wuthering Waves*, la base de Daño Crítico que figura en la hoja de estadísticas (ej. 150%) **ya incluye la base del golpe**. 
* Si no haces crítico, tu multiplicador es `1`.
* Si haces crítico, tu multiplicador es tu porcentaje `CD` convertido en decimal (ej. CD de 250% = 2.5x daño base).

### Daño Esperado (Expected Damage - E[D])
Cuando las comunidades de *theorycrafting* comparan armas y combinaciones de Ecos, no calculan el "daño máximo posible en un solo golpe crítico", sino el daño sostenido usando el multiplicador de Daño Esperado:
$$E[D] = D_{final} \times [1 + CR \times (CD - 1)]$$
* **CR** = Probabilidad de Crítico (Crit Rate) en formato decimal (ej. 65% = 0.65).
* **CD** = Daño Crítico (Crit Damage) en formato decimal.

---

**Resumen Práctico:** Para obtener el máximo daño, no acumules solamente "Daño Elemental" o "Ataque". La fórmula nos enseña que el daño crece mucho más cuando **equilibras diferentes áreas de la fórmula**: mejorar tu arma para elevar tu Base (S), subir tus bonos aditivos (B), equipar soportes que otorguen *Deepen* (A), conseguir bajadas de resistencias ($M_{RES}$) e Ignorar Defensa ($M_{DEF}$), y mantener un ratio de Probabilidad y Daño crítico saludables.
