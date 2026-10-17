// src/scripts/rasgado.ts
// Borde de papel rasgado para las fotos: arma una máscara SVG que recorta
// la foto por una línea rota, arriba, abajo o en los dos lados. Debajo de
// la máscara se ve directamente el papel de fondo de la página.
//
// Se calcula en el servidor (frontmatter) y llega a la foto como
// mask-image inline, con mask-size 100% 100%.

// Imita un papel rasgado a mano: un borde casi recto, roto en mordidas de
// todos los tamaños. Se arma sumando ruido en varias escalas: el grande le
// da la ondulación leve, el mediano las mordidas y el fino el dentado.
//
// Todo va en ancho 1000 y el corte vive en una franja de 200 de alto. Las
// medidas están pensadas para el celular: la foto mide ahí unos 390 px, así
// que cada unidad es menos de medio píxel. Con mordidas más chicas que
// esto el rasgado no se distingue.
const FRANJA = 200;
const PASO = 3;

type Punto = [number, number];

// Azar con semilla fija: el borde sale igual en cada build. Cada borde
// usa su propia semilla para que arriba y abajo no sean iguales.
function crearAzar(semilla: number) {
    let estado = semilla;
    return () => {
        estado = (estado * 16807) % 2147483647;
        return (estado - 1) / 2147483646;
    };
}

// Profundidad del corte (0 a FRANJA) a lo largo del ancho
function lineaRota(semilla: number): Punto[] {
    const azar = crearAzar(semilla);

    // Ruido suave: valores al azar cada "escala" unidades, unidos con curva
    const ruido = (escala: number) => {
        const puntos = Array.from(
            { length: Math.ceil(1000 / escala) + 2 },
            () => azar() * 2 - 1,
        );
        return (x: number) => {
            const i = Math.floor(x / escala);
            const t = x / escala - i;
            const suave = t * t * (3 - 2 * t);
            return puntos[i] + (puntos[i + 1] - puntos[i]) * suave;
        };
    };
    const ondulado = ruido(300);
    const mordidas = ruido(110);
    const dientes = ruido(32);
    const dentado = ruido(10);

    const linea: Punto[] = [];
    for (let x = 0; x <= 1000; x += PASO) {
        const y =
            92 +
            16 * ondulado(x) +
            32 * mordidas(x) +
            14 * dientes(x) +
            5 * dentado(x);
        linea.push([x, y]);
    }
    return linea;
}

const trazo = (pts: Punto[]) =>
    pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L");

interface Opciones {
    /** medidas de la foto, para que la máscara tenga su misma proporción */
    ancho: number;
    alto: number;
    arriba?: boolean;
    abajo?: boolean;
    semilla?: number;
}

/** Devuelve el valor CSS url(...) listo para mask-image */
export function mascaraRasgada({
    ancho,
    alto,
    arriba = false,
    abajo = true,
    semilla = 7,
}: Opciones): string {
    const ALTO = (1000 * alto) / ancho;

    // Arriba la franja se espeja: el corte entra desde el borde de arriba
    const bordeArriba: Punto[] = arriba
        ? lineaRota(semilla + 101).map(([x, y]) => [x, FRANJA - y])
        : [
              [0, 0],
              [1000, 0],
          ];
    const bordeAbajo: Punto[] = abajo
        ? lineaRota(semilla).map(([x, y]) => [x, ALTO - FRANJA + y])
        : [
              [0, ALTO],
              [1000, ALTO],
          ];

    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${ALTO.toFixed(1)}" preserveAspectRatio="none">` +
        `<path d="M${trazo(bordeArriba)} L${trazo([...bordeAbajo].reverse())} Z" fill="#000"/></svg>`;

    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
