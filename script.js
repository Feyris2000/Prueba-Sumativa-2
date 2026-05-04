'use strict';

/*
  Proyecto: Registro de Calificaciones en escala chilena.
  Buenas prácticas aplicadas:
  - Datos almacenados en un arreglo de objetos.
  - Funciones pequeñas y reutilizables.
  - Validación robusta de campos obligatorios, fechas, nota y ponderación.
  - Manipulación segura del DOM usando textContent y createElement.
  - Evita insertar datos dinámicos con innerHTML para prevenir XSS.
  - Persistencia local mediante localStorage.
*/

const STORAGE_KEY = 'calificacionesEscalaChilena';
let calificaciones = obtenerCalificacionesGuardadas();

const formulario = document.getElementById('formCalificacion');
const btnLimpiar = document.getElementById('btnLimpiar');
const tablaCalificaciones = document.getElementById('tablaCalificaciones');
const busqueda = document.getElementById('busqueda');
const filtroTipo = document.getElementById('filtroTipo');

const campos = {
  asignatura: document.getElementById('asignatura'),
  evaluacion: document.getElementById('evaluacion'),
  tipoEvaluacion: document.getElementById('tipoEvaluacion'),
  nota: document.getElementById('nota'),
  ponderacion: document.getElementById('ponderacion'),
  fechaExamen: document.getElementById('fechaExamen'),
  fechaPublicacion: document.getElementById('fechaPublicacion')
};

const errores = {
  asignatura: document.getElementById('errorAsignatura'),
  evaluacion: document.getElementById('errorEvaluacion'),
  tipoEvaluacion: document.getElementById('errorTipo'),
  nota: document.getElementById('errorNota'),
  ponderacion: document.getElementById('errorPonderacion'),
  fechaExamen: document.getElementById('errorFechaExamen'),
  fechaPublicacion: document.getElementById('errorFechaPublicacion')
};

document.addEventListener('DOMContentLoaded', iniciarAplicacion);
formulario.addEventListener('submit', procesarFormulario);
btnLimpiar.addEventListener('click', limpiarFormulario);
busqueda.addEventListener('input', renderizarLista);
filtroTipo.addEventListener('change', renderizarLista);

Object.values(campos).forEach((campo) => {
  campo.addEventListener('input', () => validarFormulario(false));
  campo.addEventListener('change', () => validarFormulario(false));
});

function iniciarAplicacion() {
  renderizarLista();
  actualizarResumen();
}

function procesarFormulario(evento) {
  evento.preventDefault();

  const resultadoValidacion = validarFormulario(true);
  if (!resultadoValidacion.esValido) {
    return;
  }

  const nuevaCalificacion = crearCalificacionDesdeFormulario();
  calificaciones.push(nuevaCalificacion);
  guardarEnLocalStorage();
  limpiarFormulario();
  renderizarLista();
  actualizarResumen();
}

function crearCalificacionDesdeFormulario() {
  return {
    id: crypto.randomUUID(),
    asignatura: normalizarTexto(campos.asignatura.value),
    evaluacion: normalizarTexto(campos.evaluacion.value),
    tipoEvaluacion: campos.tipoEvaluacion.value,
    nota: Number(campos.nota.value),
    ponderacion: Number(campos.ponderacion.value),
    fechaExamen: campos.fechaExamen.value,
    fechaPublicacion: campos.fechaPublicacion.value,
    fechaRegistro: new Date().toISOString()
  };
}

function validarFormulario(mostrarErrores) {
  const textosValidos = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9\s.,°#()\-]+$/;
  const fechaExamen = campos.fechaExamen.value;
  const fechaPublicacion = campos.fechaPublicacion.value;
  const nota = Number(campos.nota.value);
  const ponderacion = Number(campos.ponderacion.value);
  const ponderacionActual = calcularPonderacionTotal();
  const ponderacionDisponible = 100 - ponderacionActual;

  const validaciones = {
    asignatura: validarTextoObligatorio(campos.asignatura.value, textosValidos, 3, 60, 'La asignatura debe tener entre 3 y 60 caracteres válidos.'),
    evaluacion: validarTextoObligatorio(campos.evaluacion.value, textosValidos, 3, 60, 'La evaluación debe tener entre 3 y 60 caracteres válidos.'),
    tipoEvaluacion: campos.tipoEvaluacion.value !== '' ? '' : 'Debes seleccionar un tipo de evaluación.',
    nota: validarRangoNumerico(nota, 1, 7, 'La nota debe estar entre 1.0 y 7.0.'),
    ponderacion: validarPonderacion(ponderacion, ponderacionDisponible),
    fechaExamen: fechaExamen ? '' : 'Debes ingresar la fecha del examen.',
    fechaPublicacion: validarFechas(fechaExamen, fechaPublicacion)
  };

  if (mostrarErrores) {
    mostrarMensajes(validaciones);
  } else {
    aplicarEstadoVisual(validaciones);
  }

  return {
    esValido: Object.values(validaciones).every((mensaje) => mensaje === ''),
    validaciones
  };
}

function validarTextoObligatorio(valor, expresionRegular, minimo, maximo, mensajeError) {
  const texto = normalizarTexto(valor);
  if (texto.length < minimo || texto.length > maximo) {
    return mensajeError;
  }
  if (!expresionRegular.test(texto)) {
    return 'El campo contiene caracteres no permitidos.';
  }
  return '';
}

function validarRangoNumerico(valor, minimo, maximo, mensajeError) {
  if (!Number.isFinite(valor)) {
    return 'Debes ingresar un número válido.';
  }
  if (valor < minimo || valor > maximo) {
    return mensajeError;
  }
  return '';
}

function validarPonderacion(valor, disponible) {
  const errorRango = validarRangoNumerico(valor, 1, 100, 'La ponderación debe estar entre 1% y 100%.');
  if (errorRango) {
    return errorRango;
  }
  if (!Number.isInteger(valor)) {
    return 'La ponderación debe ser un número entero.';
  }
  if (valor > disponible) {
    return `La ponderación supera el 100%. Disponible actual: ${disponible}%.`;
  }
  return '';
}

function validarFechas(fechaExamen, fechaPublicacion) {
  if (!fechaPublicacion) {
    return 'Debes ingresar la fecha de publicación de la nota.';
  }
  if (!fechaExamen) {
    return 'Primero debes ingresar la fecha del examen.';
  }
  if (new Date(fechaPublicacion) < new Date(fechaExamen)) {
    return 'La publicación no puede ser anterior al examen.';
  }
  return '';
}

function mostrarMensajes(validaciones) {
  Object.entries(validaciones).forEach(([clave, mensaje]) => {
    errores[clave].textContent = mensaje;
    actualizarClaseCampo(campos[clave], mensaje);
  });
}

function aplicarEstadoVisual(validaciones) {
  Object.entries(validaciones).forEach(([clave, mensaje]) => {
    if (campos[clave].value.trim() === '') {
      errores[clave].textContent = '';
      campos[clave].classList.remove('valido', 'invalido');
      return;
    }
    errores[clave].textContent = mensaje;
    actualizarClaseCampo(campos[clave], mensaje);
  });
}

function actualizarClaseCampo(campo, mensaje) {
  campo.classList.toggle('valido', mensaje === '' && campo.value.trim() !== '');
  campo.classList.toggle('invalido', mensaje !== '');
}

function renderizarLista() {
  eliminarContenido(tablaCalificaciones);

  const registrosFiltrados = filtrarCalificaciones();

  if (registrosFiltrados.length === 0) {
    const filaVacia = document.createElement('tr');
    const celdaVacia = document.createElement('td');
    celdaVacia.colSpan = 8;
    celdaVacia.className = 'empty';
    celdaVacia.textContent = 'No existen calificaciones para mostrar.';
    filaVacia.appendChild(celdaVacia);
    tablaCalificaciones.appendChild(filaVacia);
    return;
  }

  registrosFiltrados.forEach((registro) => {
    tablaCalificaciones.appendChild(crearFilaCalificacion(registro));
  });
}

function crearFilaCalificacion(registro) {
  const fila = document.createElement('tr');

  agregarCeldaTexto(fila, registro.asignatura);
  agregarCeldaTexto(fila, registro.evaluacion);
  agregarCeldaTexto(fila, registro.tipoEvaluacion);

  const celdaNota = document.createElement('td');
  celdaNota.textContent = registro.nota.toFixed(1);
  celdaNota.className = registro.nota >= 4 ? 'nota-aprobada' : 'nota-reprobada';
  fila.appendChild(celdaNota);

  agregarCeldaTexto(fila, `${registro.ponderacion}%`);
  agregarCeldaTexto(fila, formatearFecha(registro.fechaExamen));
  agregarCeldaTexto(fila, formatearFecha(registro.fechaPublicacion));

  const celdaAccion = document.createElement('td');
  const botonEliminar = document.createElement('button');
  botonEliminar.type = 'button';
  botonEliminar.className = 'btn btn-danger';
  botonEliminar.textContent = 'Eliminar';
  botonEliminar.addEventListener('click', () => eliminarCalificacion(registro.id));
  celdaAccion.appendChild(botonEliminar);
  fila.appendChild(celdaAccion);

  return fila;
}

function agregarCeldaTexto(fila, texto) {
  const celda = document.createElement('td');
  celda.textContent = texto;
  fila.appendChild(celda);
}

function eliminarCalificacion(id) {
  const confirmar = window.confirm('¿Deseas eliminar esta calificación?');
  if (!confirmar) {
    return;
  }

  calificaciones = calificaciones.filter((registro) => registro.id !== id);
  guardarEnLocalStorage();
  renderizarLista();
  actualizarResumen();
  validarFormulario(false);
}

function filtrarCalificaciones() {
  const textoBusqueda = busqueda.value.trim().toLowerCase();
  const tipoSeleccionado = filtroTipo.value;

  return calificaciones.filter((registro) => {
    const coincideTexto = registro.asignatura.toLowerCase().includes(textoBusqueda)
      || registro.evaluacion.toLowerCase().includes(textoBusqueda);
    const coincideTipo = tipoSeleccionado === 'Todos' || registro.tipoEvaluacion === tipoSeleccionado;
    return coincideTexto && coincideTipo;
  });
}

function actualizarResumen() {
  const promedio = calcularPromedioPonderado();
  const ponderacionTotal = calcularPonderacionTotal();

  document.getElementById('promedioFinal').textContent = promedio > 0 ? promedio.toFixed(1) : '0.0';
  document.getElementById('ponderacionTotal').textContent = `${ponderacionTotal}%`;
  document.getElementById('totalEvaluaciones').textContent = String(calificaciones.length);

  const estadoPromedio = document.getElementById('estadoPromedio');
  estadoPromedio.textContent = obtenerEstadoPromedio(promedio, ponderacionTotal);

  const estadoPonderacion = document.getElementById('estadoPonderacion');
  estadoPonderacion.textContent = ponderacionTotal === 100
    ? 'Ponderación completa'
    : `Falta registrar ${100 - ponderacionTotal}%`;
}

function calcularPromedioPonderado() {
  const ponderacionTotal = calcularPonderacionTotal();
  if (ponderacionTotal === 0) {
    return 0;
  }

  const sumaPonderada = calificaciones.reduce((acumulador, registro) => {
    return acumulador + (registro.nota * registro.ponderacion);
  }, 0);

  return sumaPonderada / ponderacionTotal;
}

function calcularPonderacionTotal() {
  return calificaciones.reduce((total, registro) => total + registro.ponderacion, 0);
}

function obtenerEstadoPromedio(promedio, ponderacionTotal) {
  if (ponderacionTotal === 0) {
    return 'Sin registros';
  }
  if (ponderacionTotal < 100) {
    return promedio >= 4 ? 'Promedio parcial aprobado' : 'Promedio parcial bajo aprobación';
  }
  return promedio >= 4 ? 'Asignatura aprobada' : 'Asignatura reprobada';
}

function limpiarFormulario() {
  formulario.reset();
  Object.values(errores).forEach((error) => {
    error.textContent = '';
  });
  Object.values(campos).forEach((campo) => {
    campo.classList.remove('valido', 'invalido');
  });
}

function obtenerCalificacionesGuardadas() {
  try {
    const datos = localStorage.getItem(STORAGE_KEY);
    return datos ? JSON.parse(datos) : [];
  } catch (error) {
    console.error('No fue posible leer localStorage:', error);
    return [];
  }
}

function guardarEnLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(calificaciones));
}

function eliminarContenido(elemento) {
  while (elemento.firstChild) {
    elemento.removeChild(elemento.firstChild);
  }
}

function normalizarTexto(texto) {
  return texto.trim().replace(/\s+/g, ' ');
}

function formatearFecha(fechaISO) {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  return fecha.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
