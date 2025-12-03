"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Bentham } from "next/font/google";
import { Button, Modal } from "@/components/ui";
import * as XLSX from "xlsx";

import { PlanRecord } from "@/types";
import PlanTable from "./PlanTable";
import PlanUploadPanel from "./components/PlanUploadPanel";
import {
  getPlanMaterias,
  getPlanesCatalog,
  PlanOption,
  uploadPlanPdf,
  createPlanMateria,
  updatePlanMateria,
  deletePlanMateria,
  PlanMateriaFormData,
  getPlanHistorial,
  PlanHistorialItem,
  PlanUploadResponse,  
} from "@/services/planService";

type ViewMode = "table" | "upload";
type HistorialItemUI = {
  id: number;
  fecha: string;
  nombre: string;
  estado: string;
};

type AlertState = {
  kind: "success" | "error";
  title: string;
  message: string;
} | null;



const bentham = Bentham({
  weight: "400",
  subsets: ["latin"],
});

export default function PlanReportView() {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [historial, setHistorial] = useState<HistorialItemUI[]>([]);
  const [records, setRecords] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // filtros
  const [search, setSearch] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<number | "all">("all");
  const [selectedTipo, setSelectedTipo] = useState<"ALL" | "OBLIGATORIA" | "OPTATIVA">("ALL");

  // paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // catálogo de planes para filtros y formularios
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([]);

  // upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [lastUpload, setLastUpload] = useState<PlanUploadResponse | null>(null);

  // edición / creación
  const [editingRecord, setEditingRecord] = useState<PlanRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState<"edit" | "create" | null>(null);
  const [editForm, setEditForm] = useState<PlanMateriaFormData>({
    codigo: "",
    nombre_materia: "",
    creditos: 0,
    tipo: "OBLIGATORIA",
    plan_id: 0,
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
 
  const [recordToDelete, setRecordToDelete] = useState<PlanRecord | null>(null);
  const [alert, setAlert] = useState<AlertState>(null);


  // carga inicial
  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [planes, materias] = await Promise.all([
        getPlanesCatalog(),
        getPlanMaterias(),
      ]);

      setPlanOptions(planes);
      setRecords(materias);

      if (planes.length > 0 && editForm.plan_id === 0) {
        setEditForm((prev) => ({ ...prev, plan_id: planes[0].id }));
      }
    } catch (err) {
      console.error("Error al cargar planes:", err);
      setErrorMsg("Error al cargar la información de planes de estudio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
  if (viewMode !== "upload") return;

  getPlanHistorial()
    .then((items: PlanHistorialItem[]) => {
      const mapped: HistorialItemUI[] = items.map((i) => ({
        id: i.id,
        fecha: formatearFechaCorta(i.fecha),
        nombre: i.nombre_archivo,
        estado: i.estado,
      }));
      setHistorial(mapped);
    })
    .catch((err) => {
      console.error("Error al cargar historial de plan de estudios:", err);
    });
}, [viewMode]);


  // filtros combinados
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        `${r.codigo} ${r.nombre_materia} ${r.plan_nombre} ${r.plan_version}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesPlan =
        selectedPlanId === "all" ? true : r.plan_id === selectedPlanId;

      const matchesTipo =
        selectedTipo === "ALL" ? true : r.tipo.toUpperCase() === selectedTipo;

      return matchesSearch && matchesPlan && matchesTipo;
    });
  }, [records, search, selectedPlanId, selectedTipo]);

  const formatearFechaCorta = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso; // fallback

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
};

const getEstadoPillClasses = (estado: string) => {
  if (estado === "COMPLETADO" || estado === "OK") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }
  if (estado === "PENDIENTE") {
    return "bg-yellow-50 text-yellow-700 border border-yellow-200";
  }
  if (estado === "ERROR" || estado === "RECHAZADO") {
    return "bg-red-50 text-red-700 border border-red-200";
  }
  return "bg-gray-50 text-gray-600 border border-gray-200";
};


  // paginación estilo horarios/asistencia
  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginated = filteredRecords.slice(startIndex, endIndex);

  const handleShowUpload = () => setViewMode("upload");
  const handleShowTable = () => setViewMode("table");

  // exportar a Excel
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
      Codigo: r.codigo,
      NombreMateria: r.nombre_materia,
      Creditos: r.creditos,
      Tipo: r.tipo,
      Plan: r.plan_nombre,
      Version: r.plan_version,
      CreditosPlan: r.plan_total_creditos ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PlanesEstudio");

    const today = new Date().toISOString().slice(0, 10);
    const fileName = `planes_estudio_${today}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };


  // upload / procesar plan PDF
  const handleUploadPlan = async () => {
    if (!uploadFile) {
      const msg = "Selecciona primero un archivo PDF de plan de estudios.";
      setErrorMsg(msg);
      setAlert({
        kind: "error",
        title: "Archivo no seleccionado",
        message: msg,
      });
      return;
    }

    try {
      setUploadLoading(true);
      setErrorMsg(null);

      const resp = await uploadPlanPdf(uploadFile, { debug: true });
      setLastUpload(resp);

      await loadData();
      setViewMode("table");

      setAlert({
        kind: "success",
        title: "Plan procesado",
        message:
          "El plan de estudios se procesó correctamente y las materias fueron actualizadas.",
      });
    } catch (err) {
      console.error("Error al subir plan:", err);
      const msg =
        "Ocurrió un error al subir o procesar el plan de estudios.";
      setErrorMsg(msg);
      setAlert({
        kind: "error",
        title: "Error al procesar plan",
        message: msg,
      });
    } finally {
      setUploadLoading(false);
    }
  };


  // edición / creación
  const openEdit = (record: PlanRecord) => {
    setEditMode("edit");
    setEditingRecord(record);
    setEditForm({
      codigo: record.codigo,
      nombre_materia: record.nombre_materia,
      creditos: record.creditos,
      tipo: record.tipo,
      plan_id: record.plan_id,
    });
    setShowEditModal(true);
  };

  const openCreate = () => {
    setEditMode("create");
    setEditingRecord(null);
    setEditForm({
      codigo: "",
      nombre_materia: "",
      creditos: 0,
      tipo: "OBLIGATORIA",
      plan_id: planOptions[0]?.id ?? 0,
    });
    setShowEditModal(true);
  };

  const handleDelete = (record: PlanRecord) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      await deletePlanMateria(recordToDelete.id);
      setRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id));

      setAlert({
        kind: "success",
        title: "Materia eliminada",
        message: "La materia se eliminó correctamente del plan de estudios.",
      });
    } catch (err) {
      console.error("Error al eliminar materia de plan:", err);
      setAlert({
        kind: "error",
        title: "Error al eliminar",
        message:
          "No se pudo eliminar la materia del plan de estudios. Intenta de nuevo más tarde.",
      });
    } finally {
      setShowDeleteModal(false);
      setRecordToDelete(null);
    }
  };



  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingRecord(null);
    setEditMode(null);
  };

  const handleEditFieldChange = <K extends keyof PlanMateriaFormData>(
    field: K,
    value: PlanMateriaFormData[K]
  ) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEdit = async () => {
    if (
      !editForm.codigo.trim() ||
      !editForm.nombre_materia.trim() ||
      !editForm.plan_id
    ) {
      const msg = "Código, nombre de materia y plan son obligatorios.";
      setAlert({
        kind: "error",
        title: "Datos incompletos",
        message: msg,
      });
      return;
    }

    try {
      if (editMode === "edit" && editingRecord) {
        const updated = await updatePlanMateria(editingRecord.id, editForm);
        setRecords((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
      } else if (editMode === "create") {
        const created = await createPlanMateria(editForm);
        setRecords((prev) => [created, ...prev]);
        setCurrentPage(1);
      }

      handleCloseEditModal();

      setAlert({
        kind: "success",
        title:
          editMode === "create"
            ? "Materia creada"
            : "Materia actualizada",
        message:
          editMode === "create"
            ? "La materia se agregó correctamente al plan de estudios."
            : "Los cambios de la materia se guardaron correctamente.",
      });
    } catch (err) {
      console.error("Error al guardar materia de plan:", err);
      setAlert({
        kind: "error",
        title: "Error al guardar",
        message: "Ocurrió un error al guardar la materia de plan.",
      });
    }
  };


  // === RENDER ===
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Encabezado descriptivo */}
      <div className="bg-white shadow-md rounded-3xl p-6 md:p-8 mt-4 w-full">
        <div className="flex-1 px-2 sm:px-4 md:px-6">
          <h1
            className={`text-2xl md:text-3xl text-[#16469B] mb-2 ${bentham.className}`}
          >
            Planes de estudio
          </h1>

          <p className="text-sm text-gray-600 w-full">
            Visualiza y administra las <strong>materias</strong> asociadas a cada{" "}
            <strong>plan de estudio</strong>. Puedes cargar nuevos planes desde
            archivos PDF, revisar las materias resultantes y, si es necesario,
            crear o editar materias directamente desde esta vista.
          </p>

          {totalItems > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Mostrando <strong>{totalItems}</strong> materias (filtradas).
            </p>
          )}
        </div>
      </div>

      {/* Card principal: filtros + tabla / upload */}
      <div className="bg-white px-3 sm:px-6 lg:px-[54px] rounded-lg shadow-lg border border-gray-200">
        {/* Header: buscador + filtros + botón Cargar archivo */}
        <div className="flex flex-col gap-4 pt-4 sm:pt-6 pb-4 border-b-2 border-[#16469B]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* IZQUIERDA: buscador + filtros simples */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {/* buscador */}
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
                      d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"
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
                  placeholder="Buscar código, materia o plan..."
                  className="w-72 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* filtro plan */}
              <select
                value={selectedPlanId === "all" ? "all" : selectedPlanId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedPlanId(
                    value === "all" ? "all" : Number.parseInt(value, 10)
                  );
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Todos los planes</option>
                {planOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* filtro tipo */}
              <select
                value={selectedTipo}
                onChange={(e) => {
                  setSelectedTipo(e.target.value as typeof selectedTipo);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Todos los tipos</option>
                <option value="OBLIGATORIA">Obligatoria</option>
                <option value="OPTATIVA">Optativa</option>
              </select>
            </div>

            {/* DERECHA: botones */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "table" ? "outline" : "default"}
                onClick={handleShowTable}
                className="flex items-center gap-2 px-4 py-2 text-sm"
              >
                Tabla
              </Button>
              <Button
                onClick={handleShowUpload}
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
                    d="M4 4v16h16M8 12h8M12 8v8"
                  />
                </svg>
                Cargar plan
              </Button>
            </div>
          </div>

          {/* Resumen última carga (si existe) */}
          {lastUpload && (
            <div className="mt-2 text-xs text-gray-600 flex flex-wrap gap-4">
              <div>
                <span className="font-semibold">Última acción:</span>{" "}
                {lastUpload.action}
              </div>
              {lastUpload.parsed?.plan && (
                <div>
                  <span className="font-semibold">Plan:</span>{" "}
                  {lastUpload.parsed.plan.nombre} (v
                  {lastUpload.parsed.plan.version})
                </div>
              )}
              {lastUpload.ingesta && (
                <>
                  <div>
                    <span className="font-semibold">Materias entrada:</span>{" "}
                    {lastUpload.ingesta.materiasInput}
                  </div>
                  <div>
                    <span className="font-semibold">Agregadas:</span>{" "}
                    {lastUpload.ingesta.added}
                  </div>
                  <div>
                    <span className="font-semibold">Actualizadas:</span>{" "}
                    {lastUpload.ingesta.updated}
                  </div>
                  <div>
                    <span className="font-semibold">Sin cambios:</span>{" "}
                    {lastUpload.ingesta.unchanged}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* CONTENIDO: tabla o upload */}
        <div className="py-4 space-y-4">
          {viewMode === "upload" ? (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-stretch">
                {/* Panel de carga (izquierda, ~2/3) */}
                <div>
                <PlanUploadPanel
                    setFile={setUploadFile}
                    onUpload={handleUploadPlan}
                    loading={uploadLoading}
                />
                </div>

                {/* Resumen de ingesta (derecha, 1/3) */}
                {/* Resumen + Historial de ingesta (derecha, 1/3) */}
            <div className="lg:col-span-1">
              <div className="h-full flex flex-col bg-[#F7FAFC] border border-[#16469B] rounded-3xl overflow-hidden">
                {/* Header azul */}
                <div className="bg-[#16469B] text-white px-4 py-3 text-sm font-semibold">
                  Resumen de ingesta
                </div>

                {/* Contenido */}
                <div className="flex-1 p-4 text-xs text-gray-700 flex flex-col gap-3">
                  {/* --- Resumen del último upload (lo que ya tenías) --- */}
                  {!lastUpload && (
                    <p>
                      Sube y procesa un archivo de <strong>plan de estudios</strong> para
                      visualizar aquí el resumen del plan detectado y las materias
                      procesadas.
                    </p>
                  )}

                  {lastUpload && (
                    <>
                      <p className="text-[11px] text-gray-500">
                        Archivo ID: <strong>{lastUpload.archivoId}</strong>
                      </p>

                      {lastUpload.parsed?.plan && (
                        <div className="mt-1">
                          <p className="font-semibold text-[12px] text-gray-800">
                            Plan detectado
                          </p>
                          <p className="mt-1">
                            <span className="block">
                              Nombre:{" "}
                              <strong>{lastUpload.parsed.plan.nombre ?? "N/D"}</strong>
                            </span>
                            <span className="block">
                              Versión:{" "}
                              <strong>{lastUpload.parsed.plan.version ?? "N/D"}</strong>
                            </span>
                            {typeof lastUpload.parsed.plan.total_creditos === "number" && (
                              <span className="block">
                                Créditos totales:{" "}
                                <strong>{lastUpload.parsed.plan.total_creditos}</strong>
                              </span>
                            )}
                            {typeof lastUpload.parsed.plan.semestres_sugeridos ===
                              "number" && (
                              <span className="block">
                                Semestres sugeridos:{" "}
                                <strong>
                                  {lastUpload.parsed.plan.semestres_sugeridos}
                                </strong>
                              </span>
                            )}
                          </p>
                        </div>
                      )}

                      {lastUpload.ingesta && (
                        <div className="mt-2">
                          <p className="font-semibold text-[12px] text-gray-800 mb-1">
                            Resultado de ingesta (último archivo)
                          </p>
                          <ul className="space-y-1">
                            <li>
                              Materias en archivo:{" "}
                              <strong>{lastUpload.ingesta.materiasInput}</strong>
                            </li>
                            <li>
                              Agregadas:{" "}
                              <strong className="text-green-700">
                                {lastUpload.ingesta.added}
                              </strong>
                            </li>
                            <li>
                              Actualizadas:{" "}
                              <strong className="text-blue-700">
                                {lastUpload.ingesta.updated}
                              </strong>
                            </li>
                            <li>
                              Sin cambios:{" "}
                              <strong className="text-gray-700">
                                {lastUpload.ingesta.unchanged}
                              </strong>
                            </li>
                          </ul>
                        </div>
                      )}

                     {lastUpload.parsed?.warnings &&
                        lastUpload.parsed.warnings.length > 0 && (
                          <div className="mt-2">
                            <p className="font-semibold text-[12px] text-gray-800 mb-1">
                              Advertencias
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {lastUpload.parsed.warnings.map((w: string, idx: number) => (
                                <li key={idx}>{w}</li>
                              ))}
                            </ul>
                          </div>
                      )}
                    </>
                  )}

                  {/* --- Historial de ingesta (como horarios) --- */}
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    <p className="font-semibold text-[12px] text-gray-800 mb-1">
                      Historial de cargas de plan de estudios
                    </p>

                    {historial.length === 0 ? (
                      <p className="text-[11px] text-gray-500">
                        No hay cargas registradas todavía. Sube un archivo para ver aquí el
                        historial de auditoría.
                      </p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                        {historial.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start justify-between bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-gray-800 truncate">
                                {item.nombre}
                              </p>
                              <p className="text-[10px] text-gray-500">{item.fecha}</p>
                            </div>
                            <span
                              className={
                                "ml-2 inline-flex px-2 py-1 rounded-full text-[10px] font-medium " +
                                getEstadoPillClasses(item.estado)
                              }
                            >
                              {item.estado}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            </div>
            ) : (
            <>
              {errorMsg && (
                <div className="mb-2 text-xs text-red-600">{errorMsg}</div>
              )}

              <div className="mt-2">
                <PlanTable
                  records={paginated}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </div>

              {/* Paginación + Exportar */}
              <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>
                    Página <strong>{currentPage}</strong> de{" "}
                    <strong>{totalPages}</strong>
                  </span>
                  <span>
                    | Mostrando <strong>{paginated.length}</strong> de{" "}
                    <strong>{totalItems}</strong> materias
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* botones de paginación estilo horarios/asistencia */}
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      «
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ‹
                    </button>
                    <span className="px-2 py-1 text-xs">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages)
                        )
                      }
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
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

                  <Button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 text-xs bg-[#16469B] text-white rounded-lg hover:bg-[#0E325E]"
                  >
                    <span>Crear materia</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

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


      {/* MODAL CREAR / EDITAR MATERIA */}
      <Modal isOpen={showEditModal} onClose={handleCloseEditModal}>
        <div className="w-full max-w-lg mx-auto bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            {editMode === "create"
              ? "Crear materia de plan"
              : "Editar materia de plan"}
          </h2>

          <div className="space-y-4 text-sm">
            <div>
              <label className="block mb-1 font-medium text-gray-700">
                Plan de estudio
              </label>
              <select
                value={editForm.plan_id}
                onChange={(e) =>
                  handleEditFieldChange("plan_id", Number(e.target.value))
                }
                className="w-full border border-gray-300 rounded-md px-2 py-1"
              >
                {planOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium text-gray-700">
                  Código
                </label>
                <input
                  type="text"
                  value={editForm.codigo}
                  onChange={(e) =>
                    handleEditFieldChange("codigo", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium text-gray-700">
                  Créditos
                </label>
                <input
                  type="number"
                  value={editForm.creditos}
                  onChange={(e) =>
                    handleEditFieldChange(
                      "creditos",
                      Number.parseInt(e.target.value || "0", 10)
                    )
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-700">
                Nombre de la materia
              </label>
              <input
                type="text"
                value={editForm.nombre_materia}
                onChange={(e) =>
                  handleEditFieldChange("nombre_materia", e.target.value)
                }
                className="w-full border border-gray-300 rounded-md px-2 py-1"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-700">
                Tipo
              </label>
              <select
                value={editForm.tipo}
                onChange={(e) =>
                  handleEditFieldChange("tipo", e.target.value)
                }
                className="w-full border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="OBLIGATORIA">Obligatoria</option>
                <option value="OPTATIVA">Optativa</option>
                <option value="TALLER">Taller / Otra</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseEditModal}
              className="px-3 py-1.5 rounded-full text-xs border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-3 py-1.5 rounded-full text-xs bg-[#16469B] text-white hover:bg-[#0E325E]"
            >
              Guardar cambios
            </button>
          </div>
        </div>
      </Modal>
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
              Eliminar materia de plan
            </h3>

            <div className="mx-4">
              <p className="text-sm text-gray-600">
                ¿Estás seguro de que quieres eliminar esta materia del plan de
                estudios?
              </p>

              {recordToDelete && (
                <p className="text-sm text-gray-700 mt-2 mb-4">
                  <span className="font-semibold">
                    {recordToDelete.codigo} — {recordToDelete.nombre_materia}
                  </span>
                  <br />
                  Plan:{" "}
                  <span className="font-semibold">
                    {recordToDelete.plan_nombre} (v{recordToDelete.plan_version})
                  </span>
                </p>
              )}

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
