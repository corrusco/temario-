// URLs y GIDs de todas las hojas integradas
const URL_BASE_INICIAL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6XujajlsE5zknJSIU7uzHCOlawQtQxHyU-GKlkcpMhNI4DzTOZjOeXYoAcdh6LXT3YyKSGiX_IakR/pub?output=csv";

const GIDS = {
    2: "657218291", 3: "297046660", 4: "496581205", 5: "1319364121", 6: "1092651795",
    7: "1948983432", 8: "787807845", 9: "1864337176", 10: "1837358681", 14: "1210798416",
    15: "319803123", 16: "1474331143", 17: "4818603", 18: "447136162", 19: "2106894864",
    20: "352591437", 21: "1460596358", 22: "585942824", 23: "145069600", 24: "1160234615",
    25: "1443696241"
};

let capitulosLibro = [];
let currentCap = 0;
let numTemaActual = 0;
let notasPorApartado = {}; // Diccionario para guardar el contenido de la Columna E

// --- TRADUCTOR DE ROTULADORES ---
function aplicarRotulador(texto) {
    if (!texto) return "";
    return texto.replace(/\[\[([cidm])\|(.*?)\]\]/g, function(match, tipo, contenido) {
        let claseCSS = "";
        if (tipo === 'c') claseCSS = "r-concepto";
        else if (tipo === 'i') claseCSS = "r-item";
        else if (tipo === 'd') claseCSS = "r-def";
        else if (tipo === 'm') claseCSS = "r-mixto";
        return `<span class="${claseCSS}">${contenido}</span>`;
    });
}

// --- LECTOR DE VOZ (TEXT-TO-SPEECH) ---
function leerVoz(btn, event) {
    event.stopPropagation(); 

    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        document.querySelectorAll('.btn-leer').forEach(b => b.innerText = "🔊");
        if (btn.innerText === "⏹️") return; 
    }

    btn.innerText = "⏹️";

    const textoDiv = btn.nextElementSibling;
    const textoLimpio = textoDiv.innerText;

    const mensaje = new SpeechSynthesisUtterance(textoLimpio);
    mensaje.lang = 'es-ES'; 
    mensaje.rate = 1.0;     

    mensaje.onend = () => {
        btn.innerText = "🔊";
    };

    window.speechSynthesis.speak(mensaje);
}

// 1. Verificación de Seguridad (PIN 2358)
function verificarPin() {
    const input = document.getElementById('pin-input').value;
    if (input === "2358") {
        document.getElementById('pantalla-login').classList.add('hidden');
        document.getElementById('pantalla-menu').classList.remove('hidden');
        dibujarMenu();
    } else {
        alert("PIN Incorrecto.");
        document.getElementById('pin-input').value = "";
    }
}

// 2. Lógica de Colores Dinámicos
function determinarColor(texto) {
    const t = texto.toLowerCase();
    if (t.startsWith("introducción")) return "var(--color-intro)";
    if (t.startsWith("1.")) return "var(--color-punto1)";
    if (t.startsWith("2.")) return "var(--color-punto2)";
    if (t.startsWith("3.")) return "var(--color-punto3)";
    if (t.startsWith("4.")) return "var(--color-punto4)";
    if (t.startsWith("5.")) return "var(--color-punto5)";
    if (t.startsWith("6.")) return "var(--color-punto6)";
    if (t.startsWith("conclusión")) return "var(--color-concl)";
    if (t.startsWith("bibliografía")) return "var(--color-biblio)";
    return "#333";
}

function determinarClaseColor(texto) {
    const t = texto.toLowerCase();
    if (t.startsWith("introducción")) return "idx-intro";
    if (t.startsWith("1.")) return "idx-p1";
    if (t.startsWith("2.")) return "idx-p2";
    if (t.startsWith("3.")) return "idx-p3";
    if (t.startsWith("4.")) return "idx-p4";
    if (t.startsWith("5.")) return "idx-p5";
    if (t.startsWith("6.")) return "idx-p6";
    if (t.startsWith("conclusión")) return "idx-concl";
    if (t.startsWith("bibliografía")) return "idx-biblio";
    return "";
}

function determinarNivel(texto) {
    const t = texto.trim();
    if (/^(Introducción|Conclusión|Bibliografía)/i.test(t)) return "nivel-0";
    const coincidencias = t.match(/^(\d+\.)+/); 
    if (!coincidencias) return "nivel-0"; 
    const partes = coincidencias[0].split('.').filter(Boolean);
    if (partes.length === 1) return "nivel-0";
    if (partes.length === 2) return "nivel-1";
    return "nivel-2";
}

// 3. Carga Dinámica desde Google Sheets
async function cargarDatos(gid) {
    try {
        const response = await fetch(`${URL_BASE_INICIAL}&gid=${gid}&cache=${Date.now()}`);
        const csvText = await response.text();
        const filasRaw = csvText.split(/\r?\n(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        const data = filasRaw.map(linea => {
            const cols = linea.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            return {
                a: cols[0]?.replace(/^"|"$/g, '').trim() || "",
                b: cols[1]?.replace(/^"|"$/g, '').trim() || "",
                c: cols[2]?.replace(/^"|"$/g, '').trim() || "",
                d: cols[3]?.replace(/^"|"$/g, '').trim() || "",
                e: cols[4]?.replace(/^"|"$/g, '').trim() || "" 
            };
        }).filter(f => f.a || f.b || f.c);

        agruparPorCapitulos(data);
    } catch (err) { console.error("Error cargando tema:", err); }
}

function agruparPorCapitulos(data) {
    let caps = [];
    let nombreCapituloActual = ""; 
    notasPorApartado = {}; 

    data.forEach((fila) => {
        let bloqueFila = "";
        const t = fila.a.toLowerCase();
        
        if (t.startsWith("introducción")) bloqueFila = "INTRO";
        else if (t.startsWith("conclusión")) bloqueFila = "CONCLU";
        else if (t.startsWith("bibliografía")) bloqueFila = "BIBLIO";
        else if (/^\d+\./.test(fila.a)) bloqueFila = t.match(/^\d+/)[0]; 

        if (fila.a && fila.e && !notasPorApartado[fila.a]) {
            notasPorApartado[fila.a] = fila.e;
        }

        if (bloqueFila !== "" && bloqueFila !== nombreCapituloActual) {
            nombreCapituloActual = bloqueFila;
            caps.push({ titulo: fila.a, secciones: [fila], color: determinarColor(fila.a) });
        } else if (caps.length > 0) {
            caps[caps.length - 1].secciones.push(fila);
        }
    });
    capitulosLibro = caps;
}

function getEstiloBotonTema(n) {
    if (n >= 7 && n <= 10) return "border-color: #2e7d32; background: #e8f5e9; color: #1b5e20;"; 
    if (n >= 14 && n <= 19) return "border-color: #c62828; background: #ffebee; color: #b71c1c;"; 
    if (n >= 20 && n <= 25) return "border-color: #1565c0; background: #e3f2fd; color: #0d47a1;"; 
    if (n === 6) return "border-color: #fbc02d; background: #fff9c4; color: #856404;"; 
    return ""; 
}

function dibujarMenu() {
    const grid = document.getElementById('grid-temas');
    const temas = [2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    const titulos = {
        2: "Concreción del Currículo", 3: "Tutoría y Orientación", 4: "Atención a la Diversidad",
        5: "Evaluación y Promoción", 6: "Las TIC en Educación", 7: "Conocimiento del Medio",
        8: "Tiempo Histórico", 9: "Entorno y Ecosistemas", 10: "Ciencias de la Naturaleza",
        14: "Lengua y Literatura", 15: "Reflexión sobre el Lenguaje", 16: "Educación Literaria",
        17: "Adquisición del Lenguaje", 18: "Desarrollo Lector", 19: "Expresión Escrita",
        20: "Área de Matemáticas", 21: "Resolución de Problemas", 22: "Números y Cálculo",
        23: "Magnitudes y Medida", 24: "Evolución Espacial", 25: "Tratamiento de la Información"
    };

    grid.innerHTML = temas.map(n => `
        <button class="btn-tema" style="${getEstiloBotonTema(n)}" onclick="iniciarTema(${n}, GIDS[${n}])">
            TEMA ${n}. ${titulos[n].toUpperCase()}
        </button>
    `).join('');
}

function iniciarTema(numTema, gid) {
    numTemaActual = numTema;
    cargarDatos(gid).then(() => prepararIndice(numTema));
}

function prepararIndice(numTema) {
    document.getElementById('pantalla-menu').classList.add('hidden');
    document.getElementById('pantalla-indice').classList.remove('hidden');
    document.getElementById('titulo-indice-tema').innerText = `TEMA ${numTema} - ÍNDICE`;
    const lista = document.getElementById('lista-indice');
    lista.innerHTML = '';
    let vistos = new Set(); 
    capitulosLibro.forEach((cap, idxCap) => {
        cap.secciones.forEach(sec => {
            if (sec.a && !vistos.has(sec.a)) {
                const btn = document.createElement('button');
                btn.className = `btn-indice ${determinarClaseColor(cap.titulo)} ${determinarNivel(sec.a)}`;
                btn.innerHTML = sec.a; 
                btn.onclick = () => irAlCapitulo(idxCap, sec.a);
                lista.appendChild(btn);
                vistos.add(sec.a);
            }
        });
    });
}

function irAlCapitulo(indexCap, subApartado) {
    document.getElementById('pantalla-indice').classList.add('hidden');
    document.getElementById('pantalla-libro').classList.remove('hidden');
    renderCapitulo(indexCap);
    setTimeout(() => {
        const titulos = document.querySelectorAll('.apartado-titulo');
        for (let t of titulos) {
            if (t.innerText.trim() === subApartado.replace(/<[^>]*>/g, '').trim()) {
                t.scrollIntoView({ behavior: 'smooth', block: 'start' });
                break;
            }
        }
    }, 250);
}

function renderCapitulo(idx) {
    currentCap = idx;
    const cap = capitulosLibro[idx];
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = '';
    
    const header = document.getElementById('tema-header');
    header.innerHTML = `<div style="font-size:0.65rem; opacity:0.5; letter-spacing:1px; margin-bottom:2px;">TEMA ${numTemaActual}</div>${cap.titulo}`;
    header.style.color = cap.color;

    let ultimoSub = "";
    cap.secciones.forEach(sec => {
        if (sec.a && sec.a !== ultimoSub) {
            const divA = document.createElement('div');
            divA.className = "apartado-titulo";
            divA.style.borderColor = cap.color;
            divA.innerHTML = sec.a;

            let touchStartX = 0;
            divA.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].screenX;
            }, {passive: true});

            divA.addEventListener('touchend', e => {
                let touchEndX = e.changedTouches[0].screenX;
                if (touchEndX > touchStartX + 50) {
                    abrirPanelExperto(sec.a);
                }
            });

            contenedor.appendChild(divA);
            ultimoSub = sec.a;
        }

        if (sec.b || sec.c) {
            const fila = document.createElement('div');
            fila.className = "fila-estudio";
            fila.innerHTML = `
                <div class="margen-glosario">${aplicarRotulador(sec.b)}</div>
                <div class="cuerpo-principal">
                    <div class="tarjeta-c" style="border-color:${cap.color}">
                        <button class="btn-leer" onclick="leerVoz(this, event)">🔊</button>
                        <div class="texto-c" onclick="toggleD(this.parentElement)">${aplicarRotulador(sec.c)}</div>
                    </div>
                    <div class="referencia-d" style="border-left-color:${cap.color}">${aplicarRotulador(sec.d)}</div>
                </div>`;
            contenedor.appendChild(fila);
        }
    });
    actualizarBotones();
    window.scrollTo(0,0);
}

function abrirPanelExperto(tituloApartado) {
    const nota = notasPorApartado[tituloApartado];

    if (nota && nota.trim() !== "") {
        document.getElementById('contenido-experto').innerHTML = nota;
        document.getElementById('panel-experto').classList.add('abierto');
    }
}

function cerrarPanel() {
    document.getElementById('panel-experto').classList.remove('abierto');
}

function toggleD(elemento) { 
    elemento.nextElementSibling.classList.toggle('visible'); 
}

function actualizarBotones() {
    const pie = document.getElementById('pie-nav');
    pie.innerHTML = '';
    if (currentCap > 0) {
        const b = document.createElement('button'); b.className = "btn-nav"; b.innerText = "« ANT.";
        b.onclick = () => renderCapitulo(currentCap - 1); pie.appendChild(b);
    }
    const m = document.createElement('button'); m.className = "btn-nav"; m.innerText = "MENÚ";
    m.onclick = volverAlMenu; pie.appendChild(m);
    if (currentCap < capitulosLibro.length - 1) {
        const s = document.createElement('button'); s.className = "btn-nav"; s.innerText = "SIG. »";
        s.onclick = () => renderCapitulo(currentCap + 1); pie.appendChild(s);
    }
}

function mostrarIndiceInterno() {
    document.getElementById('pantalla-libro').classList.add('hidden');
    document.getElementById('pantalla-indice').classList.remove('hidden');
}

function volverAlMenu() {
    document.getElementById('pantalla-indice').classList.add('hidden');
    document.getElementById('pantalla-libro').classList.add('hidden');
    document.getElementById('pantalla-menu').classList.remove('hidden');
}
