// src/scripts/animaciones.ts
// Animaciones de entrada compartidas por toda la invitación (menos la
// portada, que tiene la suya).
//
// La idea: cada parte de un bloque entra cuando asoma en pantalla, con todos
// sus elementos a la vez y cada uno con un gesto distinto (el título se
// escribe, el adorno se abre, los nombres se cruzan, los ramos crecen desde
// su borde...). El invitado sigue bajando mientras mira, así que nada tarda
// mucho más de un segundo ni depende de varias etapas encadenadas.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/*
   toggleActions = onEnter | onLeave | onEnterBack | onLeaveBack.
   "restart" al entrar bajando la reproduce desde cero cada vez (con "play",
   una vez completada, volver a entrar no hacía nada). "reset" al salir por
   arriba la deja escondida, lista para la próxima bajada. Al volver desde
   abajo se deja como está, para no interrumpir la lectura de quien sube.
*/
const ACCIONES = "restart none none reset";

// Arranca apenas la parte asoma por abajo, así el gesto se completa
// mientras todavía está entrando en pantalla y no después.
const ARRANQUE = "top 92%";

// El recorte se pasa 40px por fuera del elemento: así no corta las sombras,
// los rulos de la cursiva ni los adornos que asoman de su caja.
const ABIERTO = "inset(-40px -40px -40px -40px)";
const CERRADO = "inset(-40px 100% -40px -40px)";

const menosMovimiento = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Los gestos de entrada, cada uno es el estado de partida del elemento.
 * Se combinan en entradaConjunta para que cada pieza entre distinta.
 */
export const gestos = {
    /** baja desde arriba */
    bajar: { y: -18, filter: "blur(6px)" },
    /** sube desde abajo */
    subir: { y: 22, filter: "blur(6px)" },
    /** se escribe de izquierda a derecha, como trazado a mano */
    trazo: { x: -20, clipPath: CERRADO, filter: "blur(4px)" },
    /** llega desde la derecha */
    desdeDerecha: { x: 34, filter: "blur(4px)" },
    /** llega desde la izquierda */
    desdeIzquierda: { x: -34, filter: "blur(4px)" },
    /** se abre desde el centro hacia los costados (adornos, líneas) */
    abrir: { scaleX: 0.1 },
    /** se acerca saliendo de un desenfoque */
    acercar: { scale: 0.85, filter: "blur(6px)" },
    /** crece girando apenas (íconos, ramos chicos) */
    crecer: { scale: 0.5, rotation: -8 },
    /**
     * Un ramo que se abre desde su borde, girando apenas hacia afuera.
     * `alto` es la altura del punto de apoyo: "center", "top" o "bottom".
     */
    ramo: (lado: "izq" | "der", alto = "center") => ({
        scale: 0.6,
        rotation: lado === "izq" ? -14 : 14,
        transformOrigin: `${lado === "izq" ? "left" : "right"} ${alto}`,
    }),
};

/**
 * Entrada conjunta: varios elementos que arrancan en el mismo instante, cada
 * uno con su propio gesto. Recibe pares [elemento, desde], donde "desde" es
 * el estado de partida (lo que no se nombre queda como está). Todos llegan a
 * su lugar a la vez, con la misma duración y la misma curva.
 *
 * Los elementos con transform propio en el CSS lo pierden al animarse: para
 * centrar o correr un elemento animado se usa la propiedad `translate`.
 */
export function entradaConjunta(
    trigger: Element | null,
    pasos: [Element | null | undefined, gsap.TweenVars][],
    { start = ARRANQUE, duration = 1.2 } = {},
) {
    if (!trigger) return;
    const validos = pasos.filter(
        (paso): paso is [Element, gsap.TweenVars] => !!paso[0],
    );
    if (validos.length === 0) return;

    const entrada = gsap.timeline({
        scrollTrigger: { trigger, start, toggleActions: ACCIONES },
        defaults: { duration, ease: "power2.out" },
    });

    validos.forEach(([elemento, desde]) => {
        if (menosMovimiento()) {
            entrada.fromTo(elemento, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0);
            return;
        }

        // El destino es el estado natural de cada propiedad que se movió
        const hasta: gsap.TweenVars = { opacity: 1 };
        for (const clave of Object.keys(desde)) {
            if (clave === "transformOrigin") continue;
            if (clave === "scale" || clave === "scaleX" || clave === "scaleY") hasta[clave] = 1;
            else if (clave === "filter") hasta.filter = "blur(0px)";
            else if (clave === "clipPath") hasta.clipPath = ABIERTO;
            else if (clave !== "opacity") hasta[clave] = 0;
        }
        entrada.fromTo(elemento, { opacity: 0, ...desde }, hasta, 0);
    });
}
