"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Bentham } from "next/font/google";
import { AttendanceRecord } from "@/types";
import {
  getAttendanceResumen,
  createAttendance,
} from "@/services/attendanceService";
import {
  uploadAsistencia,
  procesarAsistencia,
  AsistenciaResumen,
} from "@/services/asistenciaService";
import { Button, Modal } from "@/components/ui";
import AttendanceTable from "./AttendanceTable";
import AttendanceUploadPanel from "./components/AttendanceUploadPanel";
import * as XLSX from "xlsx";

const bentham = Bentham({
  weight: "400",
  subsets: ["latin"],
});

type ViewMode = "table" | "upload";
type EditMode = "edit" | "create" | null;
type AlertState = {
  kind: "success" | "error";
  title: string;
  message: string;
} | null;



export default function AttendanceReportView() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [alert, setAlert] = useState<AlertState>(null);

  // Upload / procesamiento
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resumen, setResumen] = useState<AsistenciaResumen | null>(null);

  // Búsqueda
  const [search, setSearch] = useState("");

  // Filtros
  const [filterPeriodo, setFilterPeriodo] = useState<string>("ALL");
  const [filterCodigo, setFilterCodigo] = useState<string>("ALL");
  const [filterGrupo, setFilterGrupo] = useState<string>("ALL");

  // Opciones únicas para cada filtro, derivadas de los registros
  const periodoOptions = useMemo(
    () =>
      Array.from(
        new Set(
          records
            .map((r) => r.periodo)
            .filter((v): v is string => !!v && v.trim() !== "")
        )
      ).sort(),
    [records]
  );

  const codigoOptions = useMemo(
    () =>
      Array.from(
        new Set(
          records
            .map((r) => r.codigo_materia)
            .filter((v): v is string => !!v && v.trim() !== "")
        )
      ).sort(),
    [records]
  );

  const grupoOptions = useMemo(
    () =>
      Array.from(
        new Set(
          records
            .map((r) => r.grupo)
            .filter((v): v is string => !!v && v.trim() !== "")
        )
      ).sort(),
    [records]
  );

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Edición / creación
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(
    null
  );
  const [editForm, setEditForm] = useState<Partial<AttendanceRecord>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] =useState<AttendanceRecord | null>(null);
  // Cargar datos iniciales
  useEffect(() => {
    void cargarRegistros();
  }, []);

  const cargarRegistros = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await getAttendanceResumen({});
      setRecords(data);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al cargar el resumen de asistencia.");
    } finally {
      setLoading(false);
    }
  };

  // Filtrado
  const filteredRecords = records.filter((r) => {
    const texto = `${r.periodo ?? ""} ${r.codigo_materia ?? ""} ${
      r.nombre_materia ?? ""
    } ${r.grupo ?? ""} ${r.matricula ?? ""} ${r.nombre_alumno ?? ""} ${
      r.apellido_paterno ?? ""
    } ${r.apellido_materno ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesPeriodo =
      filterPeriodo === "ALL" || r.periodo === filterPeriodo;
    const matchesCodigo =
      filterCodigo === "ALL" || r.codigo_materia === filterCodigo;
    const matchesGrupo = filterGrupo === "ALL" || r.grupo === filterGrupo;

    return texto && matchesPeriodo && matchesCodigo && matchesGrupo;
  });

  // Paginación calculada
  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginated = filteredRecords.slice(startIndex, endIndex);

  // Exportar a Excel
  const handleExport = () => {
    if (!filteredRecords.length) {
      setAlert({
        kind: "error",
        title: "Sin registros",
        message: "No hay registros para exportar.",
      });
      return;
    }

    const dataForExcel = filteredRecords.map((r) => ({
      Periodo: r.periodo ?? "",
      CodigoMateria: r.codigo_materia ?? "",
      NombreMateria: r.nombre_materia ?? "",
      Grupo: r.grupo ?? "",
      Matricula: r.matricula ?? "",
      NombreAlumno: r.nombre_alumno ?? "",
      ApellidoPaterno: r.apellido_paterno ?? "",
      ApellidoMaterno: r.apellido_materno ?? "",
      FechaAlta: r.fecha_alta ?? "",
      Fuente: r.fuente ?? "",
      Archivo: r.nombre_archivo ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencia");

    const today = new Date().toISOString().slice(0, 10);
    const fileName = `asistencia_${today}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };


  // ==== Carga de archivo: subir + procesar ====
  const handleUpload = async (periodoEtiqueta?: string) => {
    const fileToUse = selectedFile;

    if (!fileToUse) {
      const msg = "Selecciona un archivo de asistencia antes de subirlo.";
      setErrorMsg(msg);
      setAlert({
        kind: "error",
        title: "Archivo no seleccionado",
        message: msg,
      });
      return;
    }

    if (!periodoEtiqueta || !periodoEtiqueta.trim()) {
      const msg =
        'Debes indicar el periodo de la lista (por ejemplo, "2025-1") antes de procesar.';
      setErrorMsg(msg);
      setAlert({
        kind: "error",
        title: "Periodo requerido",
        message: msg,
      });
      return;
    }

    try {
      setProcessing(true);
      setErrorMsg(null);

      // 1. Subir archivo de asistencia
      const archivoId: number = await uploadAsistencia(fileToUse);

      // 2. Procesar archivo en el backend (con periodoEtiqueta)
      const resumenData: AsistenciaResumen = await procesarAsistencia(
        archivoId,
        periodoEtiqueta.trim()
      );

      // Guardar resumen en estado
      setResumen(resumenData);

      // 3. Refrescar tabla de resumen
      await cargarRegistros();

      // Si el backend manda periodo detectado, lo usamos como filtro/búsqueda
      const periodoDetectado = resumenData.periodoEtiqueta;
      if (periodoDetectado) {
        setSearch(periodoDetectado);
        setCurrentPage(1);
      }

      // Volver a la vista tabla
      setViewMode("table");

      setAlert({
        kind: "success",
        title: "Archivo procesado",
        message:
          "El archivo de asistencia se procesó correctamente y las relaciones alumno–grupo fueron actualizadas.",
      });
    } catch (err) {
      console.error("Error en handleUpload de asistencia:", err);
      const msg = "Error al subir o procesar el archivo de asistencia.";
      setErrorMsg(msg);
      setAlert({
        kind: "error",
        title: "Error al procesar asistencia",
        message: msg,
      });
    } finally {
      setProcessing(false);
    }
  };


  // ==== Edición local / creación manual ====
  const handleEditClick = (record: AttendanceRecord) => {
    setEditMode("edit");
    setEditingRecord(record);
    setEditForm({
      periodo: record.periodo,
      codigo_materia: record.codigo_materia,
      nombre_materia: record.nombre_materia,
      grupo: record.grupo,
      matricula: record.matricula,
      nombre_alumno: record.nombre_alumno,
      apellido_paterno: record.apellido_paterno,
      apellido_materno: record.apellido_materno,
    });
    setShowEditModal(true);
    setShowCreateModal(false);
  };

  const handleCreateClick = () => {
    setEditMode("create");
    setEditingRecord(null);
    setEditForm({
      periodo: "",
      codigo_materia: "",
      nombre_materia: "",
      grupo: "",
      matricula: "",
      // NO pedimos los nombres en el modal de creación
    });
    setShowCreateModal(true);
    setShowEditModal(false);
    setErrorMsg(null);
  };

  const handleDeleteClick = (record: AttendanceRecord) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!recordToDelete) return;

    setRecords((prev) =>
      prev.filter(
        (r) =>
          !(
            r.periodo === recordToDelete.periodo &&
            r.codigo_materia === recordToDelete.codigo_materia &&
            r.grupo === recordToDelete.grupo &&
            r.matricula === recordToDelete.matricula
          )
      )
    );

    setShowDeleteModal(false);
    setRecordToDelete(null);

    setAlert({
      kind: "success",
      title: "Relación eliminada",
      message: "La relación alumno–grupo se eliminó correctamente.",
    });
  };



  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setShowCreateModal(false);
    setEditingRecord(null);
    setEditForm({});
    setEditMode(null);
    setErrorMsg(null);
  };

  const handleEditFieldChange = (
    field: keyof AttendanceRecord,
    value: string
  ) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEdit = async () => {
    if (!editMode) return;

    // Validación básica para creación
    if (editMode === "create") {
      if (
        !editForm.periodo ||
        !editForm.codigo_materia ||
        !editForm.grupo ||
        !editForm.matricula
      ) {
        const msg =
          "Periodo, código de materia, grupo y matrícula son obligatorios para crear la relación.";
        setErrorMsg(msg);
        setAlert({
          kind: "error",
          title: "Datos incompletos",
          message: msg,
        });
        return;
      }
    }

    try {
      if (editMode === "edit" && editingRecord) {
        // Edición local (sin backend)
        setRecords((prev) =>
          prev.map((r) => {
            const same =
              r.periodo === editingRecord.periodo &&
              r.codigo_materia === editingRecord.codigo_materia &&
              r.grupo === editingRecord.grupo &&
              r.matricula === editingRecord.matricula;

            if (!same) return r;

            return {
              ...r,
              ...editForm,
            } as AttendanceRecord;
          })
        );
      } else if (editMode === "create") {
        // Creación real en backend
        const payload: Partial<AttendanceRecord> = {
          periodo: editForm.periodo,
          codigo_materia: editForm.codigo_materia,
          nombre_materia: editForm.nombre_materia,
          grupo: editForm.grupo,
          matricula: editForm.matricula, // puede ser lista separada por comas
          nombre_alumno: editForm.nombre_alumno,
          apellido_paterno: editForm.apellido_paterno,
          apellido_materno: editForm.apellido_materno,
        };

        const createdRecords = await createAttendance(payload);

        // Insertamos los nuevos registros al inicio
        setRecords((prev) => [...createdRecords, ...prev]);
        setCurrentPage(1);
      }

      handleCloseEditModal();

      setAlert({
        kind: "success",
        title:
          editMode === "create"
            ? "Relación creada"
            : "Relación actualizada",
        message:
          editMode === "create"
            ? "La relación alumno–grupo se creó correctamente."
            : "La relación alumno–grupo se actualizó correctamente.",
      });
    } catch (err) {
      console.error("Error al guardar relación de asistencia:", err);
      const msg = "Error al guardar la relación de asistencia.";
      setErrorMsg(msg);
      setAlert({
        kind: "error",
        title: "Error al guardar",
        message: msg,
      });
    }
  };


  // =================== RENDER ===================
  return (
    <div className="w-full flex flex-col gap-4 ">
      {/* Encabezado */}
      <div className="bg-white shadow-md rounded-3xl p-6 md:p-8 mt-4 w-full">
        <div className="flex-1 px-2 sm:px-4 md:px-6">
          <h1
            className={`text-2xl md:text-3xl text-[#16469B] mb-2 ${bentham.className}`}
          >
            Resumen de Grupos
          </h1>

          <p className="text-sm text-gray-600 w-full">
            Visualiza y administra las relaciones{" "}
            <strong>alumno–grupo–materia</strong> que se generan a partir de
            las listas de asistencia cargadas al sistema. Puedes revisar los
            registros resultantes e incluso ajustar o eliminar relaciones de
            forma manual.
          </p>

          {totalItems > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Mostrando <strong>{totalItems}</strong> registros (filtrados).
            </p>
          )}
        </div>
      </div>

      {/* ====== VISTA TABLA ====== */}
      {viewMode === "table" && (
        <div className="bg-white px-3 sm:px-6 lg:px-[54px] rounded-lg shadow-lg border border-gray-200">
          {/* Header: buscador + botón Cargar archivo */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-3 pt-4 sm:pt-6 pb-4 border-b-2 border-[#16469B]">
            {/* IZQUIERDA: buscador + filtros */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {/* Buscador */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 8 0 000 16z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar periodo, grupo, materia, alumno..."
                  className="w-72 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filtro Periodo */}
              <select
                value={filterPeriodo}
                onChange={(e) => {
                  setFilterPeriodo(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Todos los periodos</option>
                {periodoOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              {/* Filtro Código materia */}
              <select
                value={filterCodigo}
                onChange={(e) => {
                  setFilterCodigo(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Todas las materias</option>
                {codigoOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Filtro Grupo */}
              <select
                value={filterGrupo}
                onChange={(e) => {
                  setFilterGrupo(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Todos los grupos</option>
                {grupoOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* DERECHA: botones */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setViewMode("upload")}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#2E4258] rounded-lg hover:bg-[#2E4258]"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Cargar archivo
              </Button>

              <Button
                variant="outline"
                onClick={handleCreateClick}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Nuevo registro
              </Button>
            </div>
          </div>

          {/* Tabla + paginación */}
          <div className="px-3 py-4">
            {loading ? (
              <p className="text-sm text-gray-500">Cargando registros...</p>
            ) : (
              <AttendanceTable
                records={paginated}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            )}

            {errorMsg && (
              <p className="mt-3 text-xs text-red-600">{errorMsg}</p>
            )}
          </div>

          {/* Paginación + exportar */}
          <div className="px-3 pb-6 border-t border-gray-200 pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-xs text-gray-600">
              Mostrando{" "}
              <span className="font-semibold">
                {totalItems === 0 ? 0 : startIndex + 1}–{endIndex}
              </span>{" "}
              de <span className="font-semibold">{totalItems}</span> registros
              de asistencia
            </div>

            <div className="flex items-center gap-4 justify-between md:justify-end w-full md:w-auto">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs font-bold bg.white hover:bg-gray-100 rounded-full min-w-[30px] min-h-[30px] border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  «
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs font-bold bg-white hover:bg-gray-100 rounded-full min-w-[30px] min-h-[30px] border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ‹
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber = i + 1;
                  if (totalPages > 5) {
                    if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                  }
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`px-1 py-1 text-xs rounded-full min-w-[30px] min-h-[30px] border border-gray-300 font-bold ${
                        currentPage === pageNumber
                          ? "bg-[#2E4258] text-white"
                          : "bg-white hover:bg-gray-100"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="px-2 py-1 text-xs text-gray-500">
                      ...
                    </span>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-1 py-1 text-xs rounded-full min-w-[30px] min-h-[30px] border border-gray-300 font-bold bg-white hover:bg-gray-100"
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs font-bold bg-white hover:bg-gray-100 rounded-full min-w-[30px] min-h-[30px] border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs font-bold bg-white hover:bg-gray-100 rounded-full min-w-[30px] min-h-[30px] border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  »
                </button>
              </div>

              <Button
                variant="outline"
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                  />
                </svg>
                Exportar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ====== VISTA CARGA + RESUMEN ====== */}
      {viewMode === "upload" && (
        <div className="bg-white px-3 sm:px-6 lg:px-[45px] rounded-lg shadow-lg border border-gray-200">
          {/* Header superior: título + botón para volver a la tabla */}
          <div className="flex justify-between items-center px-3 pt-4 sm:pt-6 pb-4 border-b-2 border-[#16469B]">
            <h3
              className={`text-xl sm:text-2xl lg:text-3xl font-normal text-blue-800 ${bentham.className}`}
            >
              Cargar listas de asistencia
            </h3>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setViewMode("table")}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <svg
                  width="15"
                  height="17"
                  viewBox="0 0 15 17"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M13.75 1.25H11.875V0.625C11.875 0.45924 11.8092 0.300268 11.6919 0.183058C11.5747 0.065848 11.4158 0 11.25 0C11.0842 0 10.9253 0.065848 10.8081 0.183058C10.6908 0.300268 10.625 0.45924 10.625 0.625V1.25H4.375V0.625C4.375 0.45924 4.30915 0.300268 4.19194 0.183058C4.07473 0.065848 3.91576 0 3.75 0C3.58424 0 3.42527 0.065848 3.30806 0.183058C3.19085 0.300268 3.125 0.45924 3.125 0.625V1.25H1.25C0.918479 1.25 0.600537 1.3817 0.366117 1.61612C0.131696 1.85054 0 2.16848 0 2.5V15C0 15.3315 0.131696 15.6495 0.366117 15.8839C0.600537 16.1183 0.918479 16.25 1.25 16.25H13.75C14.0815 16.25 14.3995 16.1183 14.6339 15.8839C14.8683 15.6495 15 15.3315 15 15V2.5C15 2.16848 14.8683 1.85054 14.6339 1.61612C14.3995 1.3817 14.0815 1.25 13.75 1.25ZM13.75 15H1.25V5H13.75V15Z" />
                </svg>
                Ver tabla
              </Button>
            </div>
          </div>

          {/* Contenido principal: panel de carga + panel de resumen */}
          <div className="px-3 py-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            {/* Panel de carga (izquierda) */}
            <AttendanceUploadPanel
              setFile={setSelectedFile}
              onUpload={handleUpload}
              loading={processing}
            />

            {/* Panel de resumen de ingesta (derecha) */}
            <div className="border border-[#16469B] rounded-lg overflow-hidden bg-white text-xs">
              <div className="bg-[#16469B] text-white px-4 py-3 text-sm font-semibold">
                Resumen de ingesta
              </div>

              <div className="px-4 py-3 max-h-[320px] overflow-y-auto bg-gray-50">
                {processing && (
                  <p className="text-gray-600">Procesando archivo...</p>
                )}

                {!processing && !resumen && !errorMsg && (
                  <p className="text-gray-500">
                    Sube y procesa un archivo de lista de asistencia para
                    visualizar aquí el resumen de la vinculación
                    alumnos–grupos.
                  </p>
                )}

                {!processing && errorMsg && (
                  <p className="text-xs text-red-600 mb-2">{errorMsg}</p>
                )}

                {!processing && resumen && (
                  <ul className="space-y-1">
                    <li>
                      Periodo:{" "}
                      <strong>
                        {resumen.periodoEtiqueta ?? "No detectado"}
                      </strong>
                    </li>
                    <li>Alumnos vinculados: {resumen.alumnosVinculados}</li>
                    <li>Sin alumno en sistema: {resumen.alumnosSinAlumno}</li>
                    <li>Sin grupo encontrado: {resumen.alumnosSinGrupo}</li>
                    <li>
                      Inscripciones creadas: {resumen.inscripcionesCreadas}
                    </li>

                    {resumen.warnings && resumen.warnings.length > 0 && (
                      <li className="pt-1">
                        <span className="font-semibold">Avisos:</span>
                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                          {resumen.warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de alerta genérico (éxito / error) */}
      {alert && (
        <Modal isOpen={!!alert} onClose={() => setAlert(null)} title="">
          <div className="text-center pt-1 py-4 px-8">
            <div className="mb-4">
              <div
                className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
                  alert.kind === "success" ? "bg-green-100" : "bg-red-100"
                }`}
              >
                {alert.kind === "success" ? (
                  // Ícono de check
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 12.75L11.25 15L15 9.75"
                      stroke="#16A34A"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="#16A34A"
                      strokeWidth="2"
                    />
                  </svg>
                ) : (
                  // Ícono de error
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 18.3333C14.025 18.3333 17.5 14.8583 17.5 10.8333C17.5 6.80833 14.025 3.33333 10 3.33333C5.975 3.33333 2.5 6.80833 2.5 10.8333C2.5 14.8583 5.975 18.3333 10 18.3333Z"
                      stroke="#DC2626"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 7.5V11.25"
                      stroke="#DC2626"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 14.1667H10.0083"
                      stroke="#DC2626"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {alert.title}
            </h3>
            <p className="text-sm text-gray-600 mb-8">{alert.message}</p>

            <div className="flex justify-center">
              <Button
                onClick={() => setAlert(null)}
                className="px-8 rounded-2xl py-2 text-sm bg-[#16469B] hover:bg-[#123670] text-white"
              >
                Aceptar
              </Button>
            </div>
          </div>
        </Modal>
      )}


      {/* Modal de EDICIÓN de relación (con nombres) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg p-5 w-full max-w-lg">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Editar relación de asistencia
            </h3>

            {/* Periodo */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Periodo
              </label>
              <input
                type="text"
                value={editForm.periodo ?? ""}
                onChange={(e) =>
                  handleEditFieldChange("periodo", e.target.value)
                }
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
              />
            </div>

            {/* Grid principal de campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Matrícula
                </label>
                <input
                  type="text"
                  value={editForm.matricula ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange("matricula", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Grupo
                </label>
                <input
                  type="text"
                  value={editForm.grupo ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange("grupo", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Código materia
                </label>
                <input
                  type="text"
                  value={editForm.codigo_materia ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange("codigo_materia", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nombre materia
                </label>
                <input
                  type="text"
                  value={editForm.nombre_materia ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange("nombre_materia", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nombre alumno
                </label>
                <input
                  type="text"
                  value={editForm.nombre_alumno ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange("nombre_alumno", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Apellido paterno
                </label>
                <input
                  type="text"
                  value={editForm.apellido_paterno ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange("apellido_paterno", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Apellido materno
                </label>
                <input
                  type="text"
                  value={editForm.apellido_materno ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange("apellido_materno", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="mb-3 text-xs text-red-600">{errorMsg}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-full text-xs border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={handleCloseEditModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-full text-xs bg-[#16469B] text-white hover:bg-[#0E325E]"
                onClick={handleSaveEdit}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de CREACIÓN de relación (sin nombres) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg p-5 w-full max-w-lg">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Crear relación de asistencia
            </h3>

            {/* Periodo */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Periodo
              </label>
              <input
                type="text"
                value={editForm.periodo ?? ""}
                onChange={(e) =>
                  handleEditFieldChange("periodo", e.target.value)
                }
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
              />
            </div>

            {/* Grid principal de campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Matrícula(s)
                </label>
                <input
                  type="text"
                  value={editForm.matricula ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange("matricula", e.target.value)
                  }
                  placeholder="Ej. 12345 o 12345,67890"
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Grupo
                </label>
                <input
                  type="text"
                  value={editForm.grupo ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange("grupo", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Código materia
                </label>
                <input
                  type="text"
                  value={editForm.codigo_materia ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange("codigo_materia", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nombre materia (opcional)
                </label>
                <input
                  type="text"
                  value={editForm.nombre_materia ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange("nombre_materia", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="mb-3 text-xs text-red-600">{errorMsg}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-full text-xs border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={handleCloseEditModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-full text-xs bg-[#16469B] text-white hover:bg-[#0E325E]"
                onClick={handleSaveEdit}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

       {/* Delete Confirmation Modal */}
      {showDeleteModal && recordToDelete && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setRecordToDelete(null);
          }}
          title=""
        >
          <div className="text-center pt-1 py-4 px-8">
            <div className="mb-4">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16.875 3.75H13.75V3.125C13.75 2.62772 13.5525 2.15081 13.2008 1.79917C12.8492 1.44754 12.3723 1.25 11.875 1.25H8.125C7.62772 1.25 7.15081 1.44754 6.79917 1.79917C6.44754 2.15081 6.25 2.62772 6.25 3.125V3.75H3.125C2.95924 3.75 2.80027 3.81585 2.68306 3.93306C2.56585 4.05027 2.5 4.20924 2.5 4.375C2.5 4.54076 2.56585 4.69973 2.68306 4.81694C2.80027 4.93415 2.95924 5 3.125 5H3.75V16.25C3.75 16.5815 3.8817 16.8995 4.11612 17.1339C4.35054 17.3683 4.66848 17.5 5 17.5H15C15.3315 17.5 15.6495 17.3683 15.8839 17.1339C16.1183 16.8995 16.25 16.5815 16.25 16.25V5H16.875C17.0408 5 17.1997 4.93415 17.3169 4.81694C17.4342 4.69973 17.5 4.54076 17.5 4.375C17.5 4.20924 17.4342 4.05027 17.3169 3.93306C17.1997 3.81585 17.0408 3.75 16.875 3.75ZM7.5 3.125C7.5 2.95924 7.56585 2.80027 7.68306 2.68306C7.80027 2.56585 7.95924 2.5 8.125 2.5H11.875C12.0408 2.5 12.1997 2.56585 12.3169 2.68306C12.4342 2.80027 12.5 2.95924 12.5 3.125V3.75H7.5V3.125ZM15 16.25H5V5H15V16.25ZM8.75 8.125V13.125C8.75 13.2908 8.68415 13.4497 8.56694 13.5669C8.44973 13.6842 8.29076 13.75 8.125 13.75C7.95924 13.75 7.80027 13.6842 7.68306 13.5669C7.56585 13.4497 7.5 13.2908 7.5 13.125V8.125C7.5 7.95924 7.56585 7.80027 7.68306 7.68306C7.80027 7.56585 7.95924 7.5 8.125 7.5C8.29076 7.5 8.44973 7.56585 8.56694 7.68306C8.68415 7.80027 8.75 7.95924 8.75 8.125ZM12.5 8.125V13.125C12.5 13.2908 12.4342 13.4497 12.3169 13.5669C12.1997 13.6842 12.0408 13.75 11.875 13.75C11.7092 13.75 11.5503 13.6842 11.4331 13.5669C11.3158 13.4497 11.25 13.2908 11.25 13.125V8.125C11.25 7.95924 11.3158 7.80027 11.4331 7.68306C11.5503 7.56585 11.7092 7.5 11.875 7.5C12.0408 7.5 12.1997 7.56585 12.3169 7.68306C12.4342 7.80027 12.5 7.95924 12.5 8.125Z"
                    fill="#DC3545"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Eliminar registro de asistencia
            </h3>
            <div className="mx-4">
              <p className="text-sm text-gray-600">
                ¿Estás seguro de que quieres eliminar esta relación
                alumno–grupo?
              </p>

              <p className="text-sm text-gray-600 mb-2">
                {recordToDelete && (
                  <>
                    Alumno:{" "}
                    <span className="font-semibold">
                      {recordToDelete.matricula} –{" "}
                      {recordToDelete.nombre_alumno}{" "}
                      {recordToDelete.apellido_paterno}{" "}
                      {recordToDelete.apellido_materno}
                    </span>
                    <br />
                    Grupo:{" "}
                    <span className="font-semibold">
                      {recordToDelete.grupo} ({recordToDelete.codigo_materia} –{" "}
                      {recordToDelete.nombre_materia})
                    </span>
                  </>
                )}
              </p>

              <p className="text-sm text-gray-600 mb-8">
                Esta acción es permanente y no se podrá deshacer.
              </p>
            </div>
            <div className="flex justify-end space-x-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setRecordToDelete(null);
                }}
                className="px-8 rounded-2xl py-2 text-sm"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-8 rounded-2xl py-2 text-sm"
              >
                Eliminar
              </Button>
            </div>
          </div>
        </Modal>
      )}
      
    </div>
  );
}
