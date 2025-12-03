import React from "react";
import { PlanRecord } from "@/types";

interface Props {
  records: PlanRecord[];
  onEdit: (record: PlanRecord) => void;
  onDelete: (record: PlanRecord) => void;
}

const SortIcon: React.FC = () => (
  <svg className="w-3 h-4 cursor-pointer" viewBox="0 0 12 16" fill="none">
    <path d="M6 1L11.1962 5.5H0.803848L6 1Z" fill="white" />
    <path d="M6 15L0.803848 10.5H11.1962L6 15Z" fill="white" />
  </svg>
);

export default function PlanTable({ records, onEdit, onDelete }: Props) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full table-fixed min-w-[1500px]">
        {/* Encabezado estilo histórico / horarios */}
        <thead className="bg-[#4A5568]">
          <tr className="flex w-full">
            <th className="w-[80px] px-3 py-3 text-left text-xs font-normal text-white flex items-center flex-shrink-0">
              <div className="flex items-center justify-between w-full">
                <span>ID</span>
                <SortIcon />
              </div>
            </th>

            <th className="w-[120px] px-3 py-3 text-left text-xs font-normal text-white flex items-center flex-shrink-0">
              <div className="flex items-center justify-between w-full">
                <span>Código</span>
                <SortIcon />
              </div>
            </th>

            <th className="flex-1 px-3 py-3 text-left text-xs font-normal text-white flex items-center">
              <div className="flex items-center justify-between w-full">
                <span>Nombre de la materia</span>
                <SortIcon />
              </div>
            </th>

            <th className="w-[90px] px-3 py-3 text-left text-xs font-normal text-white flex items-center flex-shrink-0">
              <div className="flex items-center justify-between w-full">
                <span>Créditos</span>
                <SortIcon />
              </div>
            </th>

            <th className="w-[140px] px-3 py-3 text-left text-xs font-normal text-white flex items-center flex-shrink-0">
              <div className="flex items-center justify-between w-full">
                <span>Tipo</span>
                <SortIcon />
              </div>
            </th>

            <th className="w-[240px] px-3 py-3 text-left text-xs font-normal text-white flex items-center flex-shrink-0">
              <div className="flex items-center justify-between w-full">
                <span>Plan</span>
                <SortIcon />
              </div>
            </th>

            <th className="w-[110px] px-3 py-3 text-left text-xs font-normal text-white flex items-center flex-shrink-0">
              <div className="flex items-center justify-between w-full">
                <span>Versión</span>
                <SortIcon />
              </div>
            </th>

            <th className="w-[140px] px-3 py-3 text-left text-xs font-normal text-white flex items-center flex-shrink-0">
              <div className="flex items-center justify-between w-full">
                <span>Créd. plan</span>
                <SortIcon />
              </div>
            </th>

            <th className="w-[130px] px-3 py-3 text-left text-xs font-normal text-white flex items-center flex-shrink-0">
              <span>Acciones</span>
            </th>
          </tr>
        </thead>

        <tbody className="bg-white">
          {records.length === 0 ? (
            <tr className="flex w-full">
              <td
                className="px-3 py-4 text-sm text-gray-500 text-center flex-1"
                colSpan={9}
              >
                No hay materias registradas para los planes de estudio.
              </td>
            </tr>
          ) : (
            records.map((r) => (
              <tr
                key={r.id}
                className="flex w-full border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="w-[80px] px-3 py-3 text-xs text-gray-700 flex items-center">
                  {r.id}
                </td>
                <td className="w-[120px] px-3 py-3 text-xs text-gray-700 flex items-center font-semibold">
                  {r.codigo}
                </td>
                <td className="flex-1 px-3 py-3 text-xs text-gray-700 flex items-center">
                  {r.nombre_materia}
                </td>
                <td className="w-[90px] px-3 py-3 text-xs text-gray-700 flex items-center">
                  {r.creditos}
                </td>
                <td className="w-[140px] px-3 py-3 text-xs text-gray-700 flex items-center">
                  <span className="inline-flex px-2 py-1 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-800 uppercase tracking-wide">
                    {r.tipo}
                  </span>
                </td>
                <td className="w-[240px] px-3 py-3 text-xs text-gray-700 flex items-center">
                  {r.plan_nombre}
                </td>
                <td className="w-[110px] px-3 py-3 text-xs text-gray-700 flex items-center">
                  v{r.plan_version}
                </td>
                <td className="w-[140px] px-3 py-3 text-xs text-gray-700 flex items-center">
                  {r.plan_total_creditos ?? "-"}
                </td>
                <td className="w-[130px] px-3 py-3 text-xs text-gray-700 flex items-center justify-center gap-2">
                  <button
                        type="button"
                        className="text-[#3B5571] hover:text-blue-700 p-1"
                        onClick={() => onEdit(r)}
                        aria-label="Editar relación de asistencia"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800 p-1"
                        onClick={() => onDelete(r)}
                        aria-label="Eliminar relación de asistencia"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4
                            a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
