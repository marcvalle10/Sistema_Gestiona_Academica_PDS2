// src/components/features/attendance-report/components/AttendanceUploadPanel.tsx
import React, { useState, ChangeEvent, DragEvent } from "react";

interface Props {
  setFile: (f: File | null) => void;
  onUpload: (periodoEtiqueta?: string) => void;
  loading?: boolean;
}

export default function AttendanceUploadPanel({
  setFile,
  onUpload,
  loading = false,
}: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [periodoEtiqueta, setPeriodoEtiqueta] = useState("");

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
      setFile(file);
    }
  };

  const disabled = loading || !selectedFile;

  const handleClickUpload = () => {
    onUpload(periodoEtiqueta.trim());
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 text-xs">
      <h4 className="text-sm font-semibold text-gray-800 mb-2">
        Subir lista de asistencia (.xlsx)
      </h4>

      {/* Campo para el periodo */}
      <div className="mb-3">
        <label className="block text-[11px] font-medium text-gray-600 mb-1">
          Periodo de la lista (ej. 2025-1)
        </label>
        <input
          type="text"
          value={periodoEtiqueta}
          onChange={(e) => setPeriodoEtiqueta(e.target.value)}
          placeholder="Ej. 2025-1"
          className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-[10px] text-gray-500">
          Este valor se envía como <code>periodoEtiqueta</code> al backend,
          requerido por el proceso de ingesta.
        </p>
      </div>

      {/* Zona de drag & drop */}
      <div
        className={`mt-2 border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors ${
          dragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-gray-50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p className="text-[11px] text-gray-600 mb-2">
          Arrastra y suelta un archivo aquí, o
        </p>
        <label className="inline-flex items-center px-3 py-1 rounded-2xl text-[11px] font-semibold bg-[#0C3A5B] text-white hover:bg-[#06263B] cursor-pointer">
          Seleccionar archivo
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {selectedFile && (
          <p className="mt-2 text-[11px] text-gray-700">
            Archivo seleccionado:{" "}
            <span className="font-medium">{selectedFile.name}</span>
          </p>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={handleClickUpload}
          disabled={disabled || !periodoEtiqueta.trim()}
          className={`px-8 py-2 rounded-3xl text-sm font-semibold ${
            disabled || !periodoEtiqueta.trim()
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-[#0C3A5B] text-white hover:bg-[#06263B]"
          }`}
        >
          {loading ? "Procesando..." : "Subir y procesar"}
        </button>
      </div>
    </div>
  );
}
