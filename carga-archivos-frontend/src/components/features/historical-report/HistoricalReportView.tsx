import React, { useState, useCallback, useEffect, useRef } from "react";
import { Bentham } from "next/font/google";
import { Button, Modal } from "@/components/ui";
import { HistoricalTable } from "./HistoricalTable";
import { EditModal } from "./components/EditModal";
import {
  createHistoricalStudent,
  updateHistoricalStudent,
  deleteHistoricalStudent,
  HistoricalFormData,
} from "@/services/reportService";

import { useReports } from "@/hooks/useReports";
import { FileHistoryRecord, HistoricalRecord } from "@/types";


// Configurar la fuente Bentham
const bentham = Bentham({
  weight: "400",
  subsets: ["latin"],
});

export function HistoricalReportView() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showHistoryTable, setShowHistoryTable] = useState(false);
  const [showCombinedView, setShowCombinedView] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Sin Especificar");
  const [planFilter, setPlanFilter] = useState("Todos");
  const [tipoFilter, setTipoFilter] = useState("Todos");
  const [sexoFilter, setSexoFilter] = useState("Todos");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRecord, setEditingRecord] = useState<HistoricalRecord | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<HistoricalRecord | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<"create" | "edit">("create");
  
  type AlertModalState = {
    type: "success" | "error";
    title: string;
    message: string;
  };

  const [alertModal, setAlertModal] = useState<AlertModalState | null>(null);
  
  const itemsPerPage = 10;
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    students,
    files,
    removeFile,
    removeStudent,
    //updateStudent,
    refreshFiles,
    refreshStudents,
    uploadFile,
  } = useReports();

  // Cerrar dropdown cuando se hace clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsStatusDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        setUploadedFile(e.target.files[0]);
      }
    },
    []
  );

  const handleUpload = async (fileParam?: File) => {
    // Usar el archivo pasado por parámetro o el que está en el estado
    const fileToUpload = fileParam ?? uploadedFile;
    if (!fileToUpload) return;

    try {
      await uploadFile(
        "http://localhost:5000/estructura/upload",
        fileToUpload,
        "file"
      );

      await Promise.all([
        refreshStudents(),
        refreshFiles(),
      ]);

      setUploadedFile(null);
      setShowUploadModal(false);

      setAlertModal({
        type: "success",
        title: "Archivo procesado",
        message:
          "El archivo se procesó exitosamente y los registros ya están en la tabla.",
      });
    } catch (err) {
      console.error("Error al subir archivo (historial):", err);

      setAlertModal({
        type: "error",
        title: "Error al procesar archivo",
        message:
          "No se pudo procesar el archivo del historial. Verifica el archivo e intenta nuevamente.",
      });
    }
  };


  const handleShowHistory = () => {
    setShowHistoryTable(true);
    setShowCombinedView(false);

    // 🔽 cerrar modal y limpiar edición
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleShowCombinedView = () => {
    setShowCombinedView(true);
    setShowHistoryTable(false);

    // 🔽 cerrar modal y limpiar edición
    setIsModalOpen(false);
    setEditingRecord(null);
  };
  const handleCloseModal = () => {
    setShowUploadModal(false);
    setUploadedFile(null);
  };

    const handleDeleteFile = async (file: FileHistoryRecord) => {
    try {
      await removeFile(file);
      await refreshFiles();

      // ✅ alerta de éxito
      setAlertModal({
        type: "success",
        title: "Archivo eliminado",
        message: "El archivo de historial se eliminó correctamente.",
      });
    } catch (err) {
      console.error("Error al eliminar archivo de historial:", err);

      // ❌ alerta de error
      setAlertModal({
        type: "error",
        title: "Error al eliminar archivo",
        message:
          "No se pudo eliminar el archivo del historial. Intenta de nuevo más tarde.",
      });
    }
  };


  const handleDeleteStudent = (student: HistoricalRecord) => {
    setStudentToDelete(student);
    setShowDeleteModal(true);
  };
   const confirmDelete = async () => {
    if (!studentToDelete || !studentToDelete.id) return;

    try {
      await deleteHistoricalStudent(studentToDelete.id); // DELETE en BD
      removeStudent(studentToDelete);                    // sync rápido en front
      await refreshStudents();                           // recarga desde BD

      // ✅ alerta de éxito
      setAlertModal({
        type: "success",
        title: "Alumno eliminado",
        message:
          "El alumno fue eliminado correctamente del historial académico.",
      });
    } catch (err) {
      console.error("Error al eliminar alumno:", err);

      // ❌ alerta de error
      setAlertModal({
        type: "error",
        title: "Error al eliminar alumno",
        message:
          "No se pudo eliminar al alumno del historial. Intenta nuevamente más tarde.",
      });
    } finally {
      setShowDeleteModal(false);
      setStudentToDelete(null);
    }
  };


  const handleEditRecord = (record: HistoricalRecord) => {
    setEditingRecord(record);
    setEditMode("edit");     // 👈 marcamos modo edición
    setIsModalOpen(true);
  };

  async function handleSave(data: HistoricalFormData): Promise<void> {
    try {
      if (
        editMode === "edit" &&
        editingRecord &&
        editingRecord.id &&
        editingRecord.id !== 0
      ) {
        // EDITAR en BD
        await updateHistoricalStudent(editingRecord.id, data);

        setAlertModal({
          type: "success",
          title: "Alumno actualizado",
          message: "Los cambios se guardaron correctamente en el historial.",
        });
      } else {
        // CREAR en BD
        await createHistoricalStudent(data);

        setAlertModal({
          type: "success",
          title: "Alumno creado",
          message: "El alumno se registró correctamente en el historial.",
        });
      }

      await refreshStudents();
      // El modal se cierra desde EditModal al terminar bien
    } catch (error) {
      console.error("Error en handleSave (historial):", error);

      setAlertModal({
        type: "error",
        title: "Error al guardar",
        message:
          "Ocurrió un error al guardar los datos del alumno. Intenta de nuevo más tarde.",
      });

      throw error; // para que el modal muestre su error interno también
    }
  }

  

  // Opciones únicas para filtros extra
  const planOptions = Array.from(
    new Set(
      students
        .map((r) => r.planEstudios)
        .filter((v): v is string => !!v && v.trim() !== "")
    )
  ).sort();

  const tipoOptions = Array.from(
    new Set(
      students
        .map((r) => r.tipoAlumno)
        .filter((v): v is string => !!v && v.trim() !== "")
    )
  ).sort();

  const sexoOptions = Array.from(
    new Set(
      students
        .map((r) => r.sexo)
        .filter((v): v is string => !!v && v.trim() !== "")
    )
  ).sort();


  // Filtrar datos según búsqueda y estatus
  const filteredData = students.filter((record) => {
    const matchesSearch =
      !searchTerm ||
      record.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.expediente.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "Sin Especificar" ||
      record.estadoAcademico.toUpperCase() === statusFilter.toUpperCase();

    const matchesPlan =
      planFilter === "Todos" || record.planEstudios === planFilter;

    const matchesTipo =
      tipoFilter === "Todos" ||
      (record.tipoAlumno ?? "").toUpperCase() === tipoFilter.toUpperCase();

    const matchesSexo =
      sexoFilter === "Todos" ||
      (record.sexo ?? "").toUpperCase() === sexoFilter.toUpperCase();

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPlan &&
      matchesTipo &&
      matchesSexo
    );
  });



  function getStatusStyle(status: string) {
    switch (status) {
      case "COMPLETADO":
        return "text-green-700 bg-green-100 border border-green-300";

      case "ERROR":
        return "text-red-700 bg-red-100 border border-red-300";

      case "RECHAZADO":
        return "text-orange-700 bg-orange-100 border border-orange-300";

      case "PENDIENTE":
        return "text-yellow-700 bg-yellow-100 border border-yellow-300";

      default:
        return "text-gray-700 bg-gray-100 border border-gray-300";
    }
  }

  // Cálculos de paginación
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Vista de historial
  if (showHistoryTable) {
    return (
      <div className="bg-white px-3 sm:px-6 lg:px-[45px] rounded-lg shadow-lg border border-gray-200">
        {/* Header with search and filters */}
        <div className="flex justify-between items-center px-3 pt-4 sm:pt-6 pb-4 border-b-2 border-[#16469B]">
          {/* Left side: Search and Filter controls */}
          <div className="flex items-center gap-4">
            {/* Search Input */}
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar"
                className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16.875 7.50018C16.8757 6.34158 16.5836 5.20161 16.0258 4.18613C15.468 3.17066 14.6626 2.31262 13.6844 1.69171C12.7062 1.07081 11.587 0.70718 10.4307 0.634599C9.27438 0.562018 8.11847 0.782839 7.07034 1.27655C6.02221 1.77027 5.11584 2.52086 4.43544 3.45861C3.75503 4.39637 3.32265 5.49087 3.17846 6.64045C3.03426 7.79004 3.18293 8.95742 3.61065 10.0342C4.03837 11.1109 4.73128 12.0621 5.625 12.7994V18.7502C5.62492 18.8568 5.65211 18.9616 5.70397 19.0547C5.75584 19.1479 5.83065 19.2262 5.92131 19.2822C6.01197 19.3383 6.11546 19.3702 6.22195 19.375C6.32843 19.3798 6.43437 19.3573 6.52969 19.3096L10 17.5783L13.4711 19.3135C13.5581 19.3551 13.6535 19.3762 13.75 19.3752C13.9158 19.3752 14.0747 19.3093 14.1919 19.1921C14.3092 19.0749 14.375 18.9159 14.375 18.7502V12.7994C15.157 12.1554 15.7867 11.3462 16.2189 10.43C16.6512 9.51377 16.8752 8.51323 16.875 7.50018ZM4.375 7.50018C4.375 6.38766 4.7049 5.30012 5.32298 4.37509C5.94107 3.45007 6.81957 2.7291 7.84741 2.30335C8.87524 1.87761 10.0062 1.76622 11.0974 1.98326C12.1885 2.2003 13.1908 2.73603 13.9775 3.5227C14.7641 4.30937 15.2999 5.31165 15.5169 6.40279C15.734 7.49394 15.6226 8.62494 15.1968 9.65277C14.7711 10.6806 14.0501 11.5591 13.1251 12.1772C12.2001 12.7953 11.1125 13.1252 10 13.1252C8.50867 13.1235 7.07889 12.5304 6.02435 11.4758C4.96982 10.4213 4.37666 8.99151 4.375 7.50018ZM13.125 17.7392L10.2789 16.3166C10.1921 16.2731 10.0963 16.2505 9.99922 16.2505C9.90212 16.2505 9.80636 16.2731 9.71953 16.3166L6.875 17.7392V13.6228C7.84247 14.1173 8.91348 14.3752 10 14.3752C11.0865 14.3752 12.1575 14.1173 13.125 13.6228V17.7392ZM10 11.8752C10.8653 11.8752 11.7112 11.6186 12.4306 11.1379C13.1501 10.6571 13.7108 9.97384 14.042 9.17442C14.3731 8.37499 14.4597 7.49532 14.2909 6.64666C14.1221 5.79799 13.7054 5.01844 13.0936 4.40658C12.4817 3.79473 11.7022 3.37805 10.8535 3.20924C10.0049 3.04043 9.12519 3.12707 8.32576 3.4582C7.52633 3.78934 6.84305 4.35009 6.36232 5.06956C5.88159 5.78902 5.625 6.63488 5.625 7.50018C5.62624 8.66012 6.08758 9.7722 6.90778 10.5924C7.72798 11.4126 8.84006 11.8739 10 11.8752ZM10 4.37518C10.6181 4.37518 11.2223 4.55845 11.7362 4.90183C12.2501 5.24521 12.6506 5.73327 12.8871 6.30429C13.1236 6.87531 13.1855 7.50364 13.065 8.10983C12.9444 8.71602 12.6467 9.27285 12.2097 9.70988C11.7727 10.1469 11.2158 10.4446 10.6097 10.5651C10.0035 10.6857 9.37513 10.6238 8.80412 10.3873C8.2331 10.1508 7.74504 9.75024 7.40166 9.23633C7.05828 8.72243 6.875 8.11824 6.875 7.50018C6.875 6.67137 7.20424 5.87652 7.79029 5.29047C8.37634 4.70442 9.1712 4.37518 10 4.37518Z"
                    fill="#2E4258"
                  />
                </svg>
                <span>{statusFilter}</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    isStatusDropdownOpen ? "rotate-90" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isStatusDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  {["Sin Especificar", "Activo", "Inactivo"].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        setIsStatusDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                        status === statusFilter
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700"
                      } first:rounded-t-lg last:rounded-b-lg`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Filtro Plan de estudios */}
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Todos">Todos los planes</option>
              {planOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Filtro Tipo de alumno */}
            <select
              value={tipoFilter}
              onChange={(e) => {
                setTipoFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Todos">Todos los tipos</option>
              {tipoOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Filtro Sexo */}
            <select
              value={sexoFilter}
              onChange={(e) => {
                setSexoFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Todos">Ambos sexos</option>
              {sexoOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

          </div>

          {/* Right side: Action buttons */}
          <div className="flex items-center gap-2">
            
            {/* Historial Button */}
            <Button
              variant="outline"
              onClick={handleShowHistory}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <svg
                width="15"
                height="17"
                viewBox="0 0 15 17"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.75 1.25H11.875V0.625C11.875 0.45924 11.8092 0.300268 11.6919 0.183058C11.5747 0.065848 11.4158 0 11.25 0C11.0842 0 10.9253 0.065848 10.8081 0.183058C10.6908 0.300268 10.625 0.45924 10.625 0.625V1.25H4.375V0.625C4.375 0.45924 4.30915 0.300268 4.19194 0.183058C4.07473 0.065848 3.91576 0 3.75 0C3.58424 0 3.42527 0.065848 3.30806 0.183058C3.19085 0.300268 3.125 0.45924 3.125 0.625V1.25H1.25C0.918479 1.25 0.600537 1.3817 0.366116 1.61612C0.131696 1.85054 0 2.16848 0 2.5V15C0 15.3315 0.131696 15.6495 0.366116 15.8839C0.600537 16.1183 0.918479 16.25 1.25 16.25H13.75C14.0815 16.25 14.3995 16.1183 14.6339 15.8839C14.8683 15.6495 15 15.3315 15 15V2.5C15 2.16848 14.8683 1.85054 14.6339 1.61612C14.3995 1.3817 14.0815 1.25 13.75 1.25ZM3.125 2.5V3.125C3.125 3.29076 3.19085 3.44973 3.30806 3.56694C3.42527 3.68415 3.58424 3.75 3.75 3.75C3.91576 3.75 4.07473 3.68415 4.19194 3.56694C4.30915 3.44973 4.375 3.29076 4.375 3.125V2.5H10.625V3.125C10.625 3.29076 10.6908 3.44973 10.8081 3.56694C10.9253 3.68415 11.0842 3.75 11.25 3.75C11.4158 3.75 11.5747 3.68415 11.6919 3.56694C11.8092 3.44973 11.875 3.29076 11.875 3.125V2.5H13.75V5H1.25V2.5H3.125ZM13.75 15H1.25V6.25H13.75V15ZM8.4375 9.0625C8.4375 9.24792 8.38252 9.42918 8.2795 9.58335C8.17649 9.73752 8.03007 9.85768 7.85877 9.92864C7.68746 9.99959 7.49896 10.0182 7.3171 9.98199C7.13525 9.94581 6.9682 9.85652 6.83709 9.72541C6.70598 9.5943 6.61669 9.42725 6.58051 9.2454C6.54434 9.06354 6.56291 8.87504 6.63386 8.70373C6.70482 8.53243 6.82498 8.38601 6.97915 8.283C7.13332 8.17998 7.31458 8.125 7.5 8.125C7.74864 8.125 7.9871 8.22377 8.16291 8.39959C8.33873 8.5754 8.4375 8.81386 8.4375 9.0625ZM11.875 9.0625C11.875 9.24792 11.82 9.42918 11.717 9.58335C11.614 9.73752 11.4676 9.85768 11.2963 9.92864C11.125 9.99959 10.9365 10.0182 10.7546 9.98199C10.5727 9.94581 10.4057 9.85652 10.2746 9.72541C10.1435 9.5943 10.0542 9.42725 10.018 9.2454C9.98184 9.06354 10.0004 8.87504 10.0714 8.70373C10.1423 8.53243 10.2625 8.38601 10.4167 8.283C10.5708 8.17998 10.7521 8.125 10.9375 8.125C11.1861 8.125 11.4246 8.22377 11.6004 8.39959C11.7762 8.5754 11.875 8.81386 11.875 9.0625ZM5 12.1875C5 12.3729 4.94502 12.5542 4.842 12.7083C4.73899 12.8625 4.59257 12.9827 4.42127 13.0536C4.24996 13.1246 4.06146 13.1432 3.8796 13.107C3.69775 13.0708 3.5307 12.9815 3.39959 12.8504C3.26848 12.7193 3.17919 12.5523 3.14301 12.3704C3.10684 12.1885 3.12541 12 3.19636 11.8287C3.26732 11.6574 3.38748 11.511 3.54165 11.408C3.69582 11.305 3.87708 11.25 4.0625 11.25C4.31114 11.25 4.5496 11.3488 4.72541 11.5246C4.90123 11.7004 5 11.9389 5 12.1875ZM8.4375 12.1875C8.4375 12.3729 8.38252 12.5542 8.2795 12.7083C8.17649 12.8625 8.03007 12.9827 7.85877 13.0536C7.68746 13.1246 7.49896 13.1432 7.3171 13.107C7.13525 13.0708 6.9682 12.9815 6.83709 12.8504C6.70598 12.7193 6.61669 12.5523 6.58051 12.3704C6.54434 12.1885 6.56291 12 6.63386 11.8287C6.70482 11.6574 6.82498 11.511 6.97915 11.408C7.13332 11.305 7.31458 11.25 7.5 11.25C7.74864 11.25 7.9871 11.3488 8.16291 11.5246C8.33873 11.7004 8.4375 11.9389 8.4375 12.1875ZM11.875 12.1875C11.875 12.3729 11.82 12.5542 11.717 12.7083C11.614 12.8625 11.4676 12.9827 11.2963 13.0536C11.125 13.1246 10.9365 13.1432 10.7546 13.107C10.5727 13.0708 10.4057 12.9815 10.2746 12.8504C10.1435 12.7193 10.0542 12.5523 10.018 12.3704C9.98184 12.1885 10.0004 12 10.0714 11.8287C10.1423 11.6574 10.2625 11.511 10.4167 11.408C10.5708 11.305 10.7521 11.25 10.9375 11.25C11.1861 11.25 11.4246 11.3488 11.6004 11.5246C11.7762 11.7004 11.875 11.9389 11.875 12.1875Z"
                  fill="#2E4258"
                />
              </svg>
              Historial
            </Button>

            {/* Cargar archivo Button */}
            <Button
              onClick={handleShowCombinedView}
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
                onClick={() => {
                  const emptyRecord = {
                    id: 0, // id dummy, el backend pone el real al crear
                    nombre: "",
                    email: "",
                    matricula: "",
                    expediente: "",
                    estadoAcademico: "ACTIVO",
                  } as unknown as HistoricalRecord;

                  setEditingRecord(emptyRecord);
                  setEditMode("create");   // 👈 marcamos modo creación
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700"
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
              Crear registro
            </Button>
          </div>
        </div>

        {/* Historical Table */}
        <div className="px-3 py-4">
          <HistoricalTable
            records={paginatedData}
            onEdit={handleEditRecord}
            onRemove={handleDeleteStudent}
          />
        </div>
        {isModalOpen && (
           <EditModal
              record={editingRecord ?? {}}
              mode={editMode}   // 👈 ya no depende del id
              onSave={handleSave}
              onClose={() => {
                setIsModalOpen(false);
                setEditingRecord(null);
              }}
            />
        )}

        {/* Pagination and Export */}
        <div className="flex justify-between items-center px-3 py-4 border-t pb-8 border-gray-200">
          {/* Spacer for left side */}
          <div className="flex-1"></div>

          {/* Pagination Controls - Centered */}
          <div className="flex items-center space-x-1 justify-center">
            {/* Primera página */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs font-bold bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-full min-w-[30px] min-h-[30px] border border-gray-300"
            >
              «
            </button>

            {/* Página anterior */}
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs font-bold bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-full min-w-[30px] min-h-[30px] border border-gray-300"
            >
              ‹
            </button>

            {/* Números de página */}
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

            {/* Elipsis y última página si es necesario */}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="px-2 py-1 text-xs text-gray-500">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-1 py-1 text-xs rounded-full min-w-[30px] min-h-[30px] border border-gray-300 font-bold bg-white hover:bg-gray-100"
                >
                  {totalPages}
                </button>
              </>
            )}

            {/* Página siguiente */}
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs font-bold bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-full min-w-[30px] min-h-[30px] border border-gray-300"
            >
              ›
            </button>

            {/* Última página */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs font-bold bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-full min-w-[30px] min-h-[30px] border border-gray-300"
            >
              »
            </button>
          </div>

          

          {/* Right side with Export Button */}
          <div className="flex-1 flex justify-end">
            <Button
              variant="outline"
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Exportar
            </Button>
          </div>
          {/* Modal de confirmación de borrado */}
          {showDeleteModal && studentToDelete && (
            <Modal
              isOpen={showDeleteModal}
              onClose={() => setShowDeleteModal(false)}
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
                  Eliminar alumno
                </h3>
                <div className="mx-4">
                  <p className="text-sm text-gray-600">
                    ¿Estás seguro de que quieres eliminar este alumno del historial?
                  </p>
                  <p className="text-sm text-gray-600 mb-8">
                    Esta acción es permanente y no se podrá deshacer.
                  </p>
                </div>
                <div className="flex justify-end space-x-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteModal(false)}
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

          {/* Alert Modal (éxito / error) */}
          {alertModal && (
            <Modal
              isOpen={!!alertModal}
              onClose={() => setAlertModal(null)}
              title=""
            >
              <div className="text-center pt-1 py-4 px-8">
                <div className="mb-4">
                  <div
                    className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
                      alertModal.type === "success" ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {alertModal.type === "success" ? (
                      // Ícono de check
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9 12.5L11 14.5L15 10.5"
                          stroke="#16A34A"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="#16A34A"
                          strokeWidth="1.5"
                        />
                      </svg>
                    ) : (
                      // Ícono rojo similar al de eliminar
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
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {alertModal.title}
                </h3>
                <div className="mx-4">
                  <p className="text-sm text-gray-600">{alertModal.message}</p>
                </div>

                <div className="flex justify-center mt-8">
                  <Button
                    onClick={() => setAlertModal(null)}
                    className={`px-8 rounded-2xl py-2 text-sm ${
                      alertModal.type === "success"
                        ? "bg-[#16469B] hover:bg-[#0E325E] text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    Aceptar
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </div>
    );
  }



  // Vista combinada: Upload + Historial
  if (showCombinedView) {
    return (
      <div className="bg-white px-3 sm:px-6 lg:px-[45px] rounded-lg shadow-lg border border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center px-3 pt-4 sm:pt-6 pb-4 border-b-2 border-[#16469B]">
          <h3
            className={`text-xl sm:text-2xl lg:text-3xl font-normal text-blue-800 ${bentham.className}`}
          >
            Historial
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleShowHistory}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <svg
                width="15"
                height="17"
                viewBox="0 0 15 17"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.75 1.25H11.875V0.625C11.875 0.45924 11.8092 0.300268 11.6919 0.183058C11.5747 0.065848 11.4158 0 11.25 0C11.0842 0 10.9253 0.065848 10.8081 0.183058C10.6908 0.300268 10.625 0.45924 10.625 0.625V1.25H4.375V0.625C4.375 0.45924 4.30915 0.300268 4.19194 0.183058C4.07473 0.065848 3.91576 0 3.75 0C3.58424 0 3.42527 0.065848 3.30806 0.183058C3.19085 0.300268 3.125 0.45924 3.125 0.625V1.25H1.25C0.918479 1.25 0.600537 1.3817 0.366116 1.61612C0.131696 1.85054 0 2.16848 0 2.5V15C0 15.3315 0.131696 15.6495 0.366116 15.8839C0.600537 16.1183 0.918479 16.25 1.25 16.25H13.75C14.0815 16.25 14.3995 16.1183 14.6339 15.8839C14.8683 15.6495 15 15.3315 15 15V2.5C15 2.16848 14.8683 1.85054 14.6339 1.61612C14.3995 1.3817 14.0815 1.25 13.75 1.25ZM3.125 2.5V3.125C3.125 3.29076 3.19085 3.44973 3.30806 3.56694C3.42527 3.68415 3.58424 3.75 3.75 3.75C3.91576 3.75 4.07473 3.68415 4.19194 3.56694C4.30915 3.44973 4.375 3.29076 4.375 3.125V2.5H10.625V3.125C10.625 3.29076 10.6908 3.44973 10.8081 3.56694C10.9253 3.68415 11.0842 3.75 11.25 3.75C11.4158 3.75 11.5747 3.68415 11.6919 3.56694C11.8092 3.44973 11.875 3.29076 11.875 3.125V2.5H13.75V5H1.25V2.5H3.125ZM13.75 15H1.25V6.25H13.75V15ZM8.4375 9.0625C8.4375 9.24792 8.38252 9.42918 8.2795 9.58335C8.17649 9.73752 8.03007 9.85768 7.85877 9.92864C7.68746 9.99959 7.49896 10.0182 7.3171 9.98199C7.13525 9.94581 6.9682 9.85652 6.83709 9.72541C6.70598 9.5943 6.61669 9.42725 6.58051 9.2454C6.54434 9.06354 6.56291 8.87504 6.63386 8.70373C6.70482 8.53243 6.82498 8.38601 6.97915 8.283C7.13332 8.17998 7.31458 8.125 7.5 8.125C7.74864 8.125 7.9871 8.22377 8.16291 8.39959C8.33873 8.5754 8.4375 8.81386 8.4375 9.0625ZM11.875 9.0625C11.875 9.24792 11.82 9.42918 11.717 9.58335C11.614 9.73752 11.4676 9.85768 11.2963 9.92864C11.125 9.99959 10.9365 10.0182 10.7546 9.98199C10.5727 9.94581 10.4057 9.85652 10.2746 9.72541C10.1435 9.5943 10.0542 9.42725 10.018 9.2454C9.98184 9.06354 10.0004 8.87504 10.0714 8.70373C10.1423 8.53243 10.2625 8.38601 10.4167 8.283C10.5708 8.17998 10.7521 8.125 10.9375 8.125C11.1861 8.125 11.4246 8.22377 11.6004 8.39959C11.7762 8.5754 11.875 8.81386 11.875 9.0625ZM5 12.1875C5 12.3729 4.94502 12.5542 4.842 12.7083C4.73899 12.8625 4.59257 12.9827 4.42127 13.0536C4.24996 13.1246 4.06146 13.1432 3.8796 13.107C3.69775 13.0708 3.5307 12.9815 3.39959 12.8504C3.26848 12.7193 3.17919 12.5523 3.14301 12.3704C3.10684 12.1885 3.12541 12 3.19636 11.8287C3.26732 11.6574 3.38748 11.511 3.54165 11.408C3.69582 11.305 3.87708 11.25 4.0625 11.25C4.31114 11.25 4.5496 11.3488 4.72541 11.5246C4.90123 11.7004 5 11.9389 5 12.1875ZM8.4375 12.1875C8.4375 12.3729 8.38252 12.5542 8.2795 12.7083C8.17649 12.8625 8.03007 12.9827 7.85877 13.0536C7.68746 13.1246 7.49896 13.1432 7.3171 13.107C7.13525 13.0708 6.9682 12.9815 6.83709 12.8504C6.70598 12.7193 6.61669 12.5523 6.58051 12.3704C6.54434 12.1885 6.56291 12 6.63386 11.8287C6.70482 11.6574 6.82498 11.511 6.97915 11.408C7.13332 11.305 7.31458 11.25 7.5 11.25C7.74864 11.25 7.9871 11.3488 8.16291 11.5246C8.33873 11.7004 8.4375 11.9389 8.4375 12.1875ZM11.875 12.1875C11.875 12.3729 11.82 12.5542 11.717 12.7083C11.614 12.8625 11.4676 12.9827 11.2963 13.0536C11.125 13.1246 10.9365 13.1432 10.7546 13.107C10.5727 13.0708 10.4057 12.9815 10.2746 12.8504C10.1435 12.7193 10.0542 12.5523 10.018 12.3704C9.98184 12.1885 10.0004 12 10.0714 11.8287C10.1423 11.6574 10.2625 11.511 10.4167 11.408C10.5708 11.305 10.7521 11.25 10.9375 11.25C11.1861 11.25 11.4246 11.3488 11.6004 11.5246C11.7762 11.7004 11.875 11.9389 11.875 12.1875Z"
                  fill="#2E4258"
                />
              </svg>
              Historial
            </Button>
            <Button
              onClick={handleShowCombinedView}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[#2E4258] text-white rounded-lg hover:bg-[#1E2B3A]"
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
          </div>
        </div>

        {/* Combined Content */}
        <div className="flex gap-6 p-6">
          {/* Left Side: File Upload */}
          <div className="w-1/3 flex flex-col justify-center">
            <div
              className={`p-6 border-2 border-dashed rounded-lg text-center transition-colors ${
                dragActive
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 bg-gray-50"
              } hover:border-gray-400 hover:bg-gray-100`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <svg
                className="w-12 h-12 mx-auto mb-4 text-teal-500"
                fill="currentColor"
                viewBox="0 0 79 113"
              >
                <path d="M76.7591 23.1799L55.392 1.42434C54.4444 0.459464 53.2711 0 52.0978 0H4.69309C2.12092 0 0 2.15948 0 4.77842V80.7737C0 83.3927 2.12092 85.5521 4.69309 85.5521H34.4987V107.537C34.4987 110.156 36.6197 112.316 39.1918 112.316C41.764 112.316 43.8849 110.156 43.8849 107.767V85.5751H73.6906C76.2627 85.5751 78.158 83.4156 78.158 81.0264V26.534C78.1806 25.3394 77.7068 24.1448 76.7591 23.1799ZM57.0391 16.1731L65.9064 25.1097H57.0391V16.1731ZM69.2457 76.248H43.9075V57.2262L47.9011 60.9708C50.1574 63.2682 53.5419 61.683 54.2413 60.7411C55.8884 58.8343 55.8884 55.733 54.0157 54.0559L42.283 43.0518C40.4102 41.3747 37.5899 41.3747 35.9428 43.0518L24.21 54.0559C22.3373 55.9627 22.3373 58.8343 23.9844 60.7411C25.8571 62.6479 28.6775 62.6479 30.5502 60.9708L34.5439 57.2262V76.248H9.40875V9.55684H47.6755V29.3827C47.6755 32.0016 49.7964 34.1611 52.3686 34.1611H69.2682V76.248H69.2457Z" />
              </svg>
              <div className="space-y-2">
                <p className="font-semibold text-gray-700">
                  Arrastra tu archivo aquí
                </p>
                <p className="text-sm text-gray-600">
                  o haz click para seleccionarlo
                </p>
                <p className="text-xs text-gray-500">
                  Formatos permitidos: ? (máx. ?MB)
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                id="combined-file-upload"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    setUploadedFile(file);      // guardamos en estado
                    void handleUpload(file);    // subimos de inmediato y dispara alertas
                  }
                }}
              />
              <label
                htmlFor="combined-file-upload"
                className="mt-4 inline-block px-6 py-2 text-sm font-medium text-white bg-[#144257] rounded-lg hover:bg-[#0f3240] cursor-pointer"
              >
                Subir
              </label>
            </div>
          </div>

          {/* Right Side: Historical Table */}
          <div className="w-2/3">
            <div className="bg-white rounded-lg border border-gray-200">
              {/* Table Header */}
              <div className="bg-[#16469B] text-white px-4 py-3 rounded-t-lg">
                <div className="grid grid-cols-4 gap-4 text-center font-normal">
                  <div></div>
                  <div>Fecha de carga</div>
                  <div>Nombre del archivo</div>
                  <div>Estado</div>
                </div>
              </div>

              {/* Table Content */}
              <div className="divide-y divide-gray-200 h-80 overflow-y-auto">
                {files.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-4 gap-4 px-4 py-3 text-center text-sm"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteFile(item)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">{item.date}</div>
                    <div
                      className="text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap"
                      title={item.filename}
                    >
                      {item.filename}
                    </div>
                    <div>
                      <span
                        className={`inline-flex px-2 py-1 text-sm rounded-full ${getStatusStyle(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center px-3 pt-4 sm:pt-6 pb-4 border-t-2 border-[#16469B]"></div>
        {/* Alert Modal (éxito / error) */}
      {alertModal && (
        <Modal
          isOpen={!!alertModal}
          onClose={() => setAlertModal(null)}
          title=""
        >
          <div className="text-center pt-1 py-4 px-8">
            <div className="mb-4">
              <div
                className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
                  alertModal.type === "success" ? "bg-green-100" : "bg-red-100"
                }`}
              >
                {alertModal.type === "success" ? (
                  // Ícono de check
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 12.5L11 14.5L15 10.5"
                      stroke="#16A34A"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="#16A34A"
                      strokeWidth="1.5"
                    />
                  </svg>
                ) : (
                  // Ícono rojo similar al de eliminar
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
                )}
              </div>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {alertModal.title}
            </h3>
            <div className="mx-4">
              <p className="text-sm text-gray-600">{alertModal.message}</p>
            </div>

            <div className="flex justify-center mt-8">
              <Button
                onClick={() => setAlertModal(null)}
                className={`px-8 rounded-2xl py-2 text-sm ${
                  alertModal.type === "success"
                    ? "bg-[#16469B] hover:bg-[#0E325E] text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                Aceptar
              </Button>
            </div>
          </div>
        </Modal>
      )}
      </div>
    );
  }

  // Vista principal
  return (
    <>
      <div className="bg-white px-3 sm:px-6 lg:px-[45px] rounded-lg shadow-lg border border-gray-200">
        {/* Header with title and buttons */}
        <div className="flex justify-between items-center px-3 pt-4 sm:pt-6 pb-4 border-b-2 border-[#16469B]">
          <h3
            className={`text-xl sm:text-2xl lg:text-3xl font-normal text-blue-800 ${bentham.className}`}
          >
            Carga un archivo para visualizarlo
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleShowHistory}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 bg-white"
            >
              <svg
                width="15"
                height="17"
                viewBox="0 0 15 17"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.75 1.25H11.875V0.625C11.875 0.45924 11.8092 0.300268 11.6919 0.183058C11.5747 0.065848 11.4158 0 11.25 0C11.0842 0 10.9253 0.065848 10.8081 0.183058C10.6908 0.300268 10.625 0.45924 10.625 0.625V1.25H4.375V0.625C4.375 0.45924 4.30915 0.300268 4.19194 0.183058C4.07473 0.065848 3.91576 0 3.75 0C3.58424 0 3.42527 0.065848 3.30806 0.183058C3.19085 0.300268 3.125 0.45924 3.125 0.625V1.25H1.25C0.918479 1.25 0.600537 1.3817 0.366116 1.61612C0.131696 1.85054 0 2.16848 0 2.5V15C0 15.3315 0.131696 15.6495 0.366116 15.8839C0.600537 16.1183 0.918479 16.25 1.25 16.25H13.75C14.0815 16.25 14.3995 16.1183 14.6339 15.8839C14.8683 15.6495 15 15.3315 15 15V2.5C15 2.16848 14.8683 1.85054 14.6339 1.61612C14.3995 1.3817 14.0815 1.25 13.75 1.25ZM3.125 2.5V3.125C3.125 3.29076 3.19085 3.44973 3.30806 3.56694C3.42527 3.68415 3.58424 3.75 3.75 3.75C3.91576 3.75 4.07473 3.68415 4.19194 3.56694C4.30915 3.44973 4.375 3.29076 4.375 3.125V2.5H10.625V3.125C10.625 3.29076 10.6908 3.44973 10.8081 3.56694C10.9253 3.68415 11.0842 3.75 11.25 3.75C11.4158 3.75 11.5747 3.68415 11.6919 3.56694C11.8092 3.44973 11.875 3.29076 11.875 3.125V2.5H13.75V5H1.25V2.5H3.125ZM13.75 15H1.25V6.25H13.75V15ZM8.4375 9.0625C8.4375 9.24792 8.38252 9.42918 8.2795 9.58335C8.17649 9.73752 8.03007 9.85768 7.85877 9.92864C7.68746 9.99959 7.49896 10.0182 7.3171 9.98199C7.13525 9.94581 6.9682 9.85652 6.83709 9.72541C6.70598 9.5943 6.61669 9.42725 6.58051 9.2454C6.54434 9.06354 6.56291 8.87504 6.63386 8.70373C6.70482 8.53243 6.82498 8.38601 6.97915 8.283C7.13332 8.17998 7.31458 8.125 7.5 8.125C7.74864 8.125 7.9871 8.22377 8.16291 8.39959C8.33873 8.5754 8.4375 8.81386 8.4375 9.0625ZM11.875 9.0625C11.875 9.24792 11.82 9.42918 11.717 9.58335C11.614 9.73752 11.4676 9.85768 11.2963 9.92864C11.125 9.99959 10.9365 10.0182 10.7546 9.98199C10.5727 9.94581 10.4057 9.85652 10.2746 9.72541C10.1435 9.5943 10.0542 9.42725 10.018 9.2454C9.98184 9.06354 10.0004 8.87504 10.0714 8.70373C10.1423 8.53243 10.2625 8.38601 10.4167 8.283C10.5708 8.17998 10.7521 8.125 10.9375 8.125C11.1861 8.125 11.4246 8.22377 11.6004 8.39959C11.7762 8.5754 11.875 8.81386 11.875 9.0625ZM5 12.1875C5 12.3729 4.94502 12.5542 4.842 12.7083C4.73899 12.8625 4.59257 12.9827 4.42127 13.0536C4.24996 13.1246 4.06146 13.1432 3.8796 13.107C3.69775 13.0708 3.5307 12.9815 3.39959 12.8504C3.26848 12.7193 3.17919 12.5523 3.14301 12.3704C3.10684 12.1885 3.12541 12 3.19636 11.8287C3.26732 11.6574 3.38748 11.511 3.54165 11.408C3.69582 11.305 3.87708 11.25 4.0625 11.25C4.31114 11.25 4.5496 11.3488 4.72541 11.5246C4.90123 11.7004 5 11.9389 5 12.1875ZM8.4375 12.1875C8.4375 12.3729 8.38252 12.5542 8.2795 12.7083C8.17649 12.8625 8.03007 12.9827 7.85877 13.0536C7.68746 13.1246 7.49896 13.1432 7.3171 13.107C7.13525 13.0708 6.9682 12.9815 6.83709 12.8504C6.70598 12.7193 6.61669 12.5523 6.58051 12.3704C6.54434 12.1885 6.56291 12 6.63386 11.8287C6.70482 11.6574 6.82498 11.511 6.97915 11.408C7.13332 11.305 7.31458 11.25 7.5 11.25C7.74864 11.25 7.9871 11.3488 8.16291 11.5246C8.33873 11.7004 8.4375 11.9389 8.4375 12.1875ZM11.875 12.1875C11.875 12.3729 11.82 12.5542 11.717 12.7083C11.614 12.8625 11.4676 12.9827 11.2963 13.0536C11.125 13.1246 10.9365 13.1432 10.7546 13.107C10.5727 13.0708 10.4057 12.9815 10.2746 12.8504C10.1435 12.7193 10.0542 12.5523 10.018 12.3704C9.98184 12.1885 10.0004 12 10.0714 11.8287C10.1423 11.6574 10.2625 11.511 10.4167 11.408C10.5708 11.305 10.7521 11.25 10.9375 11.25C11.1861 11.25 11.4246 11.3488 11.6004 11.5246C11.7762 11.7004 11.875 11.9389 11.875 12.1875Z"
                  fill="#2E4258"
                />
              </svg>
              Historial
            </Button>
            <Button
              onClick={handleShowCombinedView}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[#2E4258] text-white rounded-full hover:bg-[#1E2B3A]"
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
          </div>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] py-8"></div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <Modal isOpen={showUploadModal} onClose={handleCloseModal}>
          <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Cargar Archivo
            </h2>

            <div className="space-y-4">
              {/* File drop area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300"
                } hover:border-gray-400`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {uploadedFile ? (
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <>
                    <svg
                      className="w-8 h-8 mx-auto mb-2 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-sm text-gray-600">
                      Arrastra tu archivo aquí o
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      id="modal-file-upload"
                    />
                    <label
                      htmlFor="modal-file-upload"
                      className="mt-2 inline-block px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 cursor-pointer"
                    >
                      selecciona desde tu computadora
                    </label>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleUpload()}
                  disabled={!uploadedFile}
                  className="px-6 py-2 bg-[#2E4258] rounded-3xl text-white "
                >
                  Subir Archivo
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {/* Alert Modal (éxito / error) */}
      {alertModal && (
        <Modal
          isOpen={!!alertModal}
          onClose={() => setAlertModal(null)}
          title=""
        >
          <div className="text-center pt-1 py-4 px-8">
            <div className="mb-4">
              <div
                className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
                  alertModal.type === "success" ? "bg-green-100" : "bg-red-100"
                }`}
              >
                {alertModal.type === "success" ? (
                  // Ícono de check
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 12.5L11 14.5L15 10.5"
                      stroke="#16A34A"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="#16A34A"
                      strokeWidth="1.5"
                    />
                  </svg>
                ) : (
                  // Ícono rojo similar al de eliminar
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
                )}
              </div>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {alertModal.title}
            </h3>
            <div className="mx-4">
              <p className="text-sm text-gray-600">{alertModal.message}</p>
            </div>

            <div className="flex justify-center mt-8">
              <Button
                onClick={() => setAlertModal(null)}
                className={`px-8 rounded-2xl py-2 text-sm ${
                  alertModal.type === "success"
                    ? "bg-[#16469B] hover:bg-[#0E325E] text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                Aceptar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
