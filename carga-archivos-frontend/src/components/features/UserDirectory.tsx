import React, { useState } from "react";
import { Bentham } from "next/font/google";
import { Button, Modal } from "@/components/ui";
import { Pagination } from "@/components/shared";
import { SearchFilters, UserTable } from "./user-directory/components";
import { useUserDirectory } from "@/hooks";

// Configurar la fuente Bentham
const bentham = Bentham({
  weight: "400",
  subsets: ["latin"],
});

type AlertState = {
  kind: "success" | "error";
  title: string;
  message: string;
} | null;

export function UserDirectory() {
  const {
    // tabla / filtros
    searchTerm,
    roleFilter,
    showRoleDropdown,
    userToDelete,
    showDeleteModal,
    currentPage,
    currentUsers,
    totalPages,
    loading,
    handleSearch,
    handleRoleFilter,
    handleDeleteUser,
    confirmDelete,
    paginate,
    setShowRoleDropdown,
    setShowDeleteModal,

    // crear / editar profesor
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    editingUser,
    formValues,
    handleFormChange,
    openCreateModal,
    openEditModal,
    submitCreateProfesor,
    submitEditProfesor,
  } = useUserDirectory();

  const [alert, setAlert] = useState<AlertState>(null);

  const handleSubmitCreate = async () => {
    try {
      await submitCreateProfesor();
      setShowCreateModal(false);
      setAlert({
        kind: "success",
        title: "Profesor creado",
        message: "El profesor se creó correctamente.",
      });
    } catch (error) {
      console.error("Error al crear profesor:", error);
      setAlert({
        kind: "error",
        title: "Error al crear profesor",
        message:
          "Ocurrió un error al crear el profesor. Intenta nuevamente más tarde.",
      });
    }
  };

  const handleSubmitEdit = async () => {
    try {
      await submitEditProfesor();
      setShowEditModal(false);
      setAlert({
        kind: "success",
        title: "Profesor actualizado",
        message:
          "Los datos del profesor se actualizaron correctamente.",
      });
    } catch (error) {
      console.error("Error al editar profesor:", error);
      setAlert({
        kind: "error",
        title: "Error al editar profesor",
        message:
          "Ocurrió un error al actualizar el profesor. Intenta nuevamente más tarde.",
      });
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await confirmDelete();
      setShowDeleteModal(false);
      setAlert({
        kind: "success",
        title: "Usuario eliminado",
        message: "El usuario se eliminó correctamente.",
      });
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      setAlert({
        kind: "error",
        title: "Error al eliminar usuario",
        message:
          "Ocurrió un error al eliminar el usuario. Intenta nuevamente más tarde.",
      });
    }
  };

  return (
    <>
      {/* Main Content */}
      <div className="bg-white px-3 sm:px-6 lg:px-[45px] rounded-lg shadow-lg border border-gray-200">
        {/* Title */}
        <div className="px-3 pt-4 sm:pt-6 pb-2 border-b-2 border-[#16469B] flex items-center justify-between">
          <h3
            className={`text-xl sm:text-2xl lg:text-3xl font-normal text-blue-800 ${bentham.className}`}
          >
            Directorio de usuarios
          </h3>

          <Button
            onClick={openCreateModal}
            className="bg-[#16469B] hover:bg-[#123a7f] text-white px-4 py-2 rounded-2xl text-xs sm:text-sm"
          >
            + Agregar profesor
          </Button>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          roleFilter={roleFilter}
          showRoleDropdown={showRoleDropdown}
          onSearchChange={handleSearch}
          onRoleFilterChange={handleRoleFilter}
          onToggleRoleDropdown={() => setShowRoleDropdown(!showRoleDropdown)}
        />

        {/* Table */}
        <UserTable
          currentUsers={currentUsers}
          onEditUser={openEditModal}
          onDeleteUser={handleDeleteUser}
          loading={loading}
        />

        <div
          className={`px-3 pt-4 sm:pt-1 pb-2 mt-1 border-b-2 border-[#16469B] ${
            totalPages <= 1 ? "mb-16" : ""
          }`}
        ></div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={paginate}
        />
      </div>

      {/* Modal EDITAR profesor */}
      {showEditModal && editingUser && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title=""
        >
          <div className="pt-1 py-4 px-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Editar profesor
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formValues.nombre}
                  onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Correo institucional
                </label>
                <input
                  type="email"
                  name="correo"
                  value={formValues.correo}
                  onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Número de empleado
                </label>
                <input
                  type="number"
                  name="numEmpleado"
                  value={formValues.numEmpleado}
                  onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Rol
                </label>
                <select
                name="rolId"
                value={formValues.rolId}
                onChange={handleFormChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecciona un rol</option>
                <option value={1}>Administrador</option>
                <option value={2}>Coordinador</option>
                <option value={3}>Profesor</option>
              </select>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="px-6 rounded-2xl py-2 text-sm"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitEdit}
                className="bg-[#16469B] hover:bg-[#123a7f] text-white px-6 rounded-2xl py-2 text-sm"
              >
                Guardar cambios
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal CREAR profesor */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title=""
        >
          <div className="pt-1 py-4 px-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Crear profesor
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formValues.nombre}
                  onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Correo institucional
                </label>
                <input
                  type="email"
                  name="correo"
                  value={formValues.correo}
                  onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Número de empleado
                </label>
                <input
                  type="number"
                  name="numEmpleado"
                  value={formValues.numEmpleado}
                  onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  name="rolId"
                  value={formValues.rolId}
                  onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Selecciona un rol</option>
                  <option value={1}>Administrador</option>
                  <option value={2}>Coordinador</option>
                  <option value={3}>Profesor</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="px-6 rounded-2xl py-2 text-sm"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitCreate}
                className="bg-[#16469B] hover:bg-[#123a7f] text-white px-6 rounded-2xl py-2 text-sm"
              >
                Guardar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
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
              Eliminar usuario
            </h3>
            <div className="mx-4">
              <p className="text-sm text-gray-600">
                ¿Estás seguro de que quieres eliminar a este usuario?
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
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-8 rounded-2xl py-2 text-sm"
              >
                Eliminar
              </Button>
            </div>
          </div>
        </Modal>
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
                className="px-8 rounded-2xl py-2 text-sm bg-[#16469B] hover:bg-[#123a7f] text-white"
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
