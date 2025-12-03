import React, { useState } from "react";
import { HistoricalRecord } from "@/types/historical";
import type { HistoricalFormData } from "@/services/reportService";

interface EditModalProps {
  record: Partial<HistoricalRecord>;
  mode: "create" | "edit";
  onClose: () => void;
  onSave: (formData: HistoricalFormData) => Promise<void> | void;
}

export function EditModal({ record, mode, onClose, onSave }: EditModalProps) {
  const [formData, setFormData] = useState<Partial<HistoricalRecord>>(record);
  const [error, setError] = useState<string | null>(null);

  // ✅ errores por campo
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData(
      (prev) =>
        ({
          ...prev,
          [name]: value,
        } as Partial<HistoricalRecord>)
    );

    // limpiar error de ese campo cuando el usuario escribe
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const rest = { ...prev };
      delete rest[name];
      return rest;
    });
  };

  const handleSave = async () => {
    // Obligatorios:
    // Matrícula, Expediente, Nombre completo, Correo institucional,
    // Estado académico, ING, Plan Estudios, Sexo
    const required = {
      matricula: formData.matricula?.trim(),
      expediente: formData.expediente?.trim(),
      nombre: formData.nombre?.trim(),
      email: formData.email?.trim(),
      estadoAcademico: formData.estadoAcademico,
      nivelIngles: formData.nivelIngles?.trim(),
      planEstudios: formData.planEstudios?.trim(),
      sexo: formData.sexo?.trim(),
    };

    const newFieldErrors: Record<string, string> = {};

    if (!required.matricula) {
      newFieldErrors.matricula = "La matrícula es obligatoria.";
    }
    if (!required.expediente) {
      newFieldErrors.expediente = "El expediente es obligatorio.";
    }
    if (!required.nombre) {
      newFieldErrors.nombre = "El nombre completo es obligatorio.";
    }
    if (!required.email) {
      newFieldErrors.email = "El correo institucional es obligatorio.";
    }
    if (!required.estadoAcademico) {
      newFieldErrors.estadoAcademico = "Selecciona el estado académico.";
    }
    if (!required.nivelIngles) {
      newFieldErrors.nivelIngles = "El nivel de inglés es obligatorio.";
    }
    if (!required.planEstudios) {
      newFieldErrors.planEstudios = "El plan de estudios es obligatorio.";
    }
    if (!required.sexo) {
      newFieldErrors.sexo = "El sexo es obligatorio.";
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError("Completa todos los campos obligatorios marcados con *.");
      return;
    }

    setFieldErrors({});
    setError(null);

    try {
      // Guardado real en BD
      await onSave(formData as HistoricalFormData);

      // Si no truena, cerramos el modal
      onClose();
    } catch (e: unknown) {
      console.error("Error al guardar alumno:", e);

      const message =
        e instanceof Error
          ? e.message
          : "Ocurrió un error al guardar en la base de datos. Revisa la consola.";

      setError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-lg p-5 w-full max-w-3xl">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">
          {mode === "create"
            ? "Crear registro histórico de alumno"
            : "Editar registro histórico de alumno"}
        </h3>

        {error && (
          <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {/* Sección 1: Datos básicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {/* Matrícula */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Matrícula *
            </label>
            <input
              type="text"
              name="matricula"
              value={formData.matricula ?? ""}
              onChange={handleChange}
              className={`w-full rounded-md px-2 py-1 text-xs border ${
                fieldErrors.matricula ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.matricula && (
              <p className="mt-1 text-[10px] text-red-600">
                {fieldErrors.matricula}
              </p>
            )}
          </div>

          {/* Expediente */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Expediente *
            </label>
            <input
              type="text"
              name="expediente"
              value={formData.expediente ?? ""}
              onChange={handleChange}
              className={`w-full rounded-md px-2 py-1 text-xs border ${
                fieldErrors.expediente ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.expediente && (
              <p className="mt-1 text-[10px] text-red-600">
                {fieldErrors.expediente}
              </p>
            )}
          </div>

          {/* Nombre completo */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nombre completo *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre ?? ""}
              onChange={handleChange}
              className={`w-full rounded-md px-2 py-1 text-xs border ${
                fieldErrors.nombre ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.nombre && (
              <p className="mt-1 text-[10px] text-red-600">
                {fieldErrors.nombre}
              </p>
            )}
          </div>

          {/* Correo institucional */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Correo institucional *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email ?? ""}
              onChange={handleChange}
              className={`w-full rounded-md px-2 py-1 text-xs border ${
                fieldErrors.email ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-[10px] text-red-600">
                {fieldErrors.email}
              </p>
            )}
          </div>
        </div>

        {/* Sección 2: Estado académico / inglés / plan / sexo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {/* Estado académico */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Estado académico *
            </label>
            <select
              name="estadoAcademico"
              value={formData.estadoAcademico ?? ""}
              onChange={handleChange}
              className={`w-full rounded-md px-2 py-1 text-xs bg-white border ${
                fieldErrors.estadoAcademico
                  ? "border-red-400"
                  : "border-gray-300"
              }`}
            >
              <option value="">Selecciona...</option>
              <option value="ACTIVO">ACTIVO</option>
              <option value="INACTIVO">INACTIVO</option>
            </select>
            {fieldErrors.estadoAcademico && (
              <p className="mt-1 text-[10px] text-red-600">
                {fieldErrors.estadoAcademico}
              </p>
            )}
          </div>

          {/* Nivel de inglés (ING) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nivel de inglés (ING) *
            </label>
            <input
              type="text"
              name="nivelIngles"
              placeholder="Ej. B1, B2, C1..."
              value={formData.nivelIngles ?? ""}
              onChange={handleChange}
              className={`w-full rounded-md px-2 py-1 text-xs border ${
                fieldErrors.nivelIngles ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.nivelIngles && (
              <p className="mt-1 text-[10px] text-red-600">
                {fieldErrors.nivelIngles}
              </p>
            )}
          </div>

          {/* Plan de estudios */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Plan de estudios *
            </label>
            <input
              type="text"
              name="planEstudios"
              value={formData.planEstudios ?? ""}
              onChange={handleChange}
              className={`w-full rounded-md px-2 py-1 text-xs border ${
                fieldErrors.planEstudios ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.planEstudios && (
              <p className="mt-1 text-[10px] text-red-600">
                {fieldErrors.planEstudios}
              </p>
            )}
          </div>

          {/* Sexo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Sexo *
            </label>
            <input
              type="text"
              name="sexo"
              placeholder="M, F, Otro..."
              value={formData.sexo ?? ""}
              onChange={handleChange}
              className={`w-full rounded-md px-2 py-1 text-xs border ${
                fieldErrors.sexo ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.sexo && (
              <p className="mt-1 text-[10px] text-red-600">
                {fieldErrors.sexo}
              </p>
            )}
          </div>
        </div>

        {/* Sección 3: Datos adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {/* Total créditos */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Total créditos
            </label>
            <input
              type="number"
              name="creditos"
              value={formData.creditos ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
            />
          </div>

          {/* Tipo de alumno */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Tipo de alumno
            </label>
            <input
              type="text"
              name="tipoAlumno"
              value={formData.tipoAlumno ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
            />
          </div>

          {/* Promedio general */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Promedio general
            </label>
            <input
              type="number"
              step="0.01"
              name="promedioGeneral"
              value={formData.promedioGeneral ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
            />
          </div>

          {/* Promedio periodo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Promedio período
            </label>
            <input
              type="number"
              step="0.01"
              name="promedioPeriodo"
              value={formData.promedioPeriodo ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
            />
          </div>

          {/* Fecha de nacimiento */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fecha de nacimiento
            </label>
            <input
              type="date"
              name="fechaNacimiento"
              value={formData.fechaNacimiento ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
            />
          </div>

          {/* Materias aprobadas */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Materias aprobadas
            </label>
            <input
              type="number"
              name="materiasAprobadas"
              value={formData.materiasAprobadas ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
            />
          </div>

          {/* Materias reprobadas */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Materias reprobadas
            </label>
            <input
              type="number"
              name="materiasReprobadas"
              value={formData.materiasReprobadas ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
            />
          </div>

          {/* Periodo inicio */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Periodo inicio
            </label>
            <input
              type="number"
              name="periodoInicio"
              value={formData.periodoInicio ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
            />
          </div>

          {/* Acta examen profesional */}
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Acta examen profesional
            </label>
            <input
              type="text"
              name="actaExamenProfesional"
              value={formData.actaExamenProfesional ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
            />
          </div>

          {/* Constancia exención examen profesional */}
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Constancia exención examen profesional
            </label>
            <input
              type="text"
              name="constanciaExencionExamenProfesional"
              value={formData.constanciaExencionExamenProfesional ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
            />
          </div>

          {/* Fecha titulación */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fecha titulación
            </label>
            <input
              type="date"
              name="fechaTitulacion"
              value={formData.fechaTitulacion ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
            />
          </div>

          {/* Créditos Culturest */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Créditos Culturest
            </label>
            <input
              type="number"
              step="0.01"
              name="creditosCulturest"
              value={formData.creditosCulturest ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
            />
          </div>

          {/* Créditos deportes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Créditos deportes
            </label>
            <input
              type="number"
              name="creditosDeportes"
              value={formData.creditosDeportes ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            className="px-3 py-1.5 rounded-full text-xs border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 rounded-full text-xs bg-blue-600 text-white hover:bg-blue-700"
          >
            {mode === "create" ? "Crear" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
