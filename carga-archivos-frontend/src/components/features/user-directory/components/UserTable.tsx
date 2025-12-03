import React from "react";
import { Search } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { UserTableProps } from "@/types";
import { UserTableSkeleton } from "./UserTableSkeleton";

export function UserTable({
  currentUsers,
  onEditUser,
  onDeleteUser,
  loading = false,
  showActions = true,
}: UserTableProps) {
  if (loading) {
    return <UserTableSkeleton />;
  }

  return (
    <div className="overflow-x-auto px-2 sm:px-6 lg:px-[45px]">
      <table className="w-full min-w-[700px] table-fixed">
        <thead className="bg-[#2E4258] text-white">
          <tr className="flex w-full">
            <th className="flex-[0_0_8%] px-2 py-3 text-left flex items-center">
              <input
                type="checkbox"
                className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-sm"
              />
            </th>

            {/* Nombre */}
            <th className="flex-[0_0_30%] px-2 py-3 text-left text-xs font-normal flex items-center">
              <div className="flex items-center justify-between w-full">
                <span>Nombre completo</span>
                <svg
                  width="12"
                  height="16"
                  viewBox="0 0 12 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="cursor-pointer"
                >
                  <path d="M6 1L11.1962 5.5H0.803848L6 1Z" fill="#9C9C9C" />
                  <path d="M6 15L0.803848 10.5H11.1962L6 15Z" fill="#9C9C9C" />
                </svg>
              </div>
            </th>

            {/* Correo */}
            <th className="flex-[0_0_23%] px-2 py-3 text-left text-xs font-normal hidden md:flex items-center">
              <div className="flex items-center justify-between w-full">
                <span>Correo institucional</span>
                <svg
                  width="12"
                  height="16"
                  viewBox="0 0 12 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="cursor-pointer"
                >
                  <path d="M6 1L11.1962 5.5H0.803848L6 1Z" fill="#9C9C9C" />
                  <path d="M6 15L0.803848 10.5H11.1962L6 15Z" fill="#9C9C9C" />
                </svg>
              </div>
            </th>

            {/* Núm. empleado */}
            <th className="flex-[0_0_12%] px-2 py-3 text-left text-xs font-normal flex items-center">
              <div className="flex items-center justify-between w-full">
                <span>Núm. empleado</span>
                <svg
                  width="12"
                  height="16"
                  viewBox="0 0 12 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="cursor-pointer"
                >
                  <path d="M6 1L11.1962 5.5H0.803848L6 1Z" fill="#9C9C9C" />
                  <path d="M6 15L0.803848 10.5H11.1962L6 15Z" fill="#9C9C9C" />
                </svg>
              </div>
            </th>

            {/* Rol */}
            <th className="flex-[0_0_12%] px-2 py-3 text-left text-xs font-normal flex items-center">
              <div className="flex items-center justify-between w-full">
                <span>Rol</span>
                <svg
                  width="12"
                  height="16"
                  viewBox="0 0 12 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="cursor-pointer"
                >
                  <path d="M6 1L11.1962 5.5H0.803848L6 1Z" fill="#9C9C9C" />
                  <path d="M6 15L0.803848 10.5H11.1962L6 15Z" fill="#9C9C9C" />
                </svg>
              </div>
            </th>

            {/* Acciones */}
            <th className="flex-[0_0_15%] px-2 py-3 text-left text-xs font-normal flex items-center">
              <div className="flex items-center justify-between w-full">
                <span>Acciones</span>
                <svg
                  width="12"
                  height="16"
                  viewBox="0 0 12 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="cursor-pointer"
                >
                  <path d="M6 1L11.1962 5.5H0.803848L6 1Z" fill="#9C9C9C" />
                  <path d="M6 15L0.803848 10.5H11.1962L6 15Z" fill="#9C9C9C" />
                </svg>
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {currentUsers.length > 0 ? (
            currentUsers.map((user, index) => (
              <tr
                key={user.id}
                className={`flex w-full border-b border-gray-200 hover:bg-gray-50 ${
                  index % 2 === 0 ? "bg-[#F9FAFB]" : "bg-[#F3F8FF]"
                }`}
              >
                {/* Checkbox */}
                <td className="flex-[0_0_8%] px-2 py-3 flex items-center">
                  <input
                    type="checkbox"
                    className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-sm border-[1px] border-gray-300"
                  />
                </td>

                {/* Nombre */}
                <td className="flex-[0_0_30%] px-2 py-3 flex items-center">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                    <UserAvatar user={user} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-normal text-[#3B5571] truncate">
                        {user.nombre}
                      </div>
                      <div className="text-xs text-[#3B5571] md:hidden truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Correo */}
                <td className="flex-[0_0_23%] px-2 py-3 whitespace-nowrap hidden md:flex items-center">
                  <div className="text-xs text-[#3B5571] truncate">
                    {user.email}
                  </div>
                </td>

                {/* Núm. empleado */}
                <td className="flex-[0_0_12%] px-2 py-3 whitespace-nowrap flex items-center">
                  <div className="text-xs text-[#3B5571]">
                    {user.numEmpleado}
                  </div>
                </td>

                {/* Rol */}
                <td className="flex-[0_0_12%] px-2 py-3 whitespace-nowrap flex items-center">
                  <div className="text-xs text-[#3B5571]">{user.rol}</div>
                </td>

                {/* Acciones */}
                {showActions && (
                  <td className="flex-[0_0_15%] px-2 py-3 whitespace-nowrap flex items-center justify-end flex-shrink-0">
                    <div className="flex items-center justify-end w-full space-x-2">
                      {/* Botón Editar */}
                       <button
                        type="button"
                        className="text-[#3B5571] hover:text-blue-700 p-1"
                        onClick={() => onEditUser(user)}
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

                      {/* Botón Eliminar */}
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800 p-1"
                        onClick={() => onDeleteUser(user)}
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
                    </div>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr className="flex w-full">
              <td className="w-full px-2 sm:px-2 py-1 sm:py-1 text-center">
                <div className="text-gray-500">
                  <Search className="mx-auto h-6 w-6 sm:h-9 sm:w-9 text-gray-300 mb-3" />
                  <p className="text-sm sm:text-base font-medium">
                    No se encontraron usuarios
                  </p>
                  <p className="text-xs">
                    Intenta ajustar tus filtros o búsqueda
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
