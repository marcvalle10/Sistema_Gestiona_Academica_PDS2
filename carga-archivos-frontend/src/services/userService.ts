import { supabase } from "@/lib/supabase";
import { User, Role } from "@/types";

interface UserData {
  id: number; // id de la tabla usuario
  email: string;

  usuario_rol: {
    rol: {
      id: number;
      nombre: string;
    };
  }[];

  profesor: {
    id: number; // id de la tabla profesor
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    num_empleado: number;
    correo: string;
  }[];

  alumno: {
    id: number;
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string | null;
  }[];
}

// ===== Helpers internos =====

function splitNombreCompleto(fullName: string): {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
} {
  const partes = fullName.trim().split(/\s+/);

  if (partes.length === 1) {
    return {
      nombre: partes[0],
      // ponemos algo no vacío porque en BD es NOT NULL
      apellido_paterno: "N/A",
      apellido_materno: null,
    };
  }

  if (partes.length === 2) {
    return {
      nombre: partes[0],
      apellido_paterno: partes[1],
      apellido_materno: null,
    };
  }

  return {
    nombre: partes[0],
    apellido_paterno: partes.slice(1, -1).join(" "),
    apellido_materno: partes[partes.length - 1],
  };
}

async function getRoleNameFromDb(roleId: number): Promise<string> {
  const { data, error } = await supabase
    .from("rol")
    .select("id, nombre")
    .eq("id", roleId)
    .maybeSingle();

  if (error) {
    console.warn("No se pudo obtener el nombre del rol:", error);
    return "Sin rol";
  }

  return data?.nombre ?? "Sin rol";
}

/**
 * Obtiene usuarios con sus roles, filtrando solo profesores.
 * Mapea a la interfaz User usada en el front.
 */
export async function getUsersWithRoles(): Promise<User[]> {
  const { data, error } = await supabase
    .from("usuario")
    .select(
      `
      id,
      email,
      usuario_rol (
        rol (
          id,
          nombre
        )
      ),
      profesor (
        id,
        nombre,
        apellido_paterno,
        apellido_materno,
        num_empleado,
        correo
      ),
      alumno (
        id,
        nombre,
        apellido_paterno,
        apellido_materno
      )
    `
    )
    .returns<UserData[]>();

  if (error) {
    console.error("Error al obtener usuarios con roles:", error);
    throw error;
  }

  // Solo tomamos usuarios que SÍ tengan registro en profesor
  const usuarios: User[] =
    data
      ?.filter((usuario) => usuario.profesor && usuario.profesor.length > 0)
      .map((usuario) => {
        const rolObj = usuario.usuario_rol?.[0]?.rol;
        const rolNombre = rolObj?.nombre ?? "Sin rol";
        const rolId = rolObj?.id ?? 0;

        const profesor = usuario.profesor[0];

        const apMaternoProf = profesor.apellido_materno ?? "";
        const nombreCompletoProfesor = `${profesor.nombre} ${profesor.apellido_paterno} ${apMaternoProf}`.trim();

        const user: User = {
          id: profesor.id, // este id lo usamos como id lógico en el front
          profesorId: profesor.id,
          usuarioId: usuario.id,
          nombre: nombreCompletoProfesor,
          email: profesor.correo || usuario.email,
          numEmpleado: profesor.num_empleado,
          rol: rolNombre,
          rolId,
          imagen: null,
        };

        return user;
      }) ?? [];

  return usuarios;
}

/**
 * Obtiene todos los roles disponibles.
 */
export async function getRoles(): Promise<Role[]> {
  const { data, error } = await supabase.from("rol").select("*").order("id");

  if (error) {
    console.error("Error al obtener roles:", error);
    throw error;
  }

  return data as Role[];
}

/**
 * Actualiza el rol asociado a un usuario en la tabla usuario_rol.
 */
export async function updateUserRole(
  userId: number,
  roleId: number
): Promise<void> {
  // Eliminar roles anteriores
  const { error: deleteError } = await supabase
    .from("usuario_rol")
    .delete()
    .eq("usuario_id", userId);

  if (deleteError) {
    console.error("Error al eliminar roles anteriores:", deleteError);
    throw deleteError;
  }

  // Insertar nuevo rol
  const { error: insertError } = await supabase.from("usuario_rol").insert([
    {
      usuario_id: userId,
      rol_id: roleId,
    },
  ]);

  if (insertError) {
    console.error("Error al asignar nuevo rol:", insertError);
    throw insertError;
  }
}

/**
 * Elimina un usuario y sus asociaciones (rol, profesor, alumno).
 */
export async function deleteUser(userId: number): Promise<void> {
  // Eliminar relaciones en usuario_rol
  const { error: rolesError } = await supabase
    .from("usuario_rol")
    .delete()
    .eq("usuario_id", userId);

  if (rolesError) {
    console.error("Error al eliminar roles del usuario:", rolesError);
    throw rolesError;
  }

  // Eliminar profesor ligado
  const { error: profesorError } = await supabase
    .from("profesor")
    .delete()
    .eq("usuario_id", userId);

  if (profesorError) {
    console.error("Error al eliminar profesor:", profesorError);
    throw profesorError;
  }

  // Eliminar alumno ligado (por si existe)
  const { error: alumnoError } = await supabase
    .from("alumno")
    .delete()
    .eq("usuario_id", userId);

  if (alumnoError) {
    console.error("Error al eliminar alumno:", alumnoError);
    throw alumnoError;
  }

  // Finalmente eliminar el registro de usuario
  const { error: userError } = await supabase
    .from("usuario")
    .delete()
    .eq("id", userId);

  if (userError) {
    console.error("Error al eliminar usuario:", userError);
    throw userError;
  }
}

// ==========================
//   Crear / Editar PROFESOR
// ==========================

interface CreateProfesorInput {
  nombreCompleto: string;
  correo: string;
  numEmpleado: number;
  rolId: number;
}

interface UpdateProfesorInput extends CreateProfesorInput {
  profesorId: number;
  usuarioId: number;
}

/**
 * Crea un usuario + profesor + usuario_rol en la BD
 * y regresa el objeto User listo para la tabla.
 */
export async function createProfesor(
  input: CreateProfesorInput
): Promise<User> {
  const { nombreCompleto, correo, numEmpleado, rolId } = input;

  const rolIdFinal = rolId && rolId > 0 ? rolId : 3; // default PROFESOR

  const { nombre, apellido_paterno, apellido_materno } =
    splitNombreCompleto(nombreCompleto);

  // 1) Crear usuario en BD con contraseña cifrada = numEmpleado
  const { data: usuarioData, error: usuarioError } = await supabase.rpc(
    "crear_usuario_con_password",
    {
      p_email: correo,
      p_password: String(numEmpleado),
    }
  );

  if (usuarioError || usuarioData == null) {
    console.error("Error al crear usuario:", usuarioError);
    throw usuarioError ?? new Error("No se pudo crear usuario");
  }

  // rpc devuelve el ID del usuario (INTEGER)
  const usuarioId = usuarioData as number;

  // 2) Crear profesor
  const { data: profesorData, error: profesorError } = await supabase
    .from("profesor")
    .insert([
      {
        nombre,
        apellido_paterno,
        apellido_materno,
        correo,
        num_empleado: numEmpleado,
        usuario_id: usuarioId,
      },
    ])
    .select(
      "id, nombre, apellido_paterno, apellido_materno, correo, num_empleado"
    )
    .single();

  if (profesorError || !profesorData) {
    console.error("Error al crear profesor:", profesorError);
    throw profesorError ?? new Error("No se pudo crear profesor");
  }

  // 3) Asignar rol al usuario
  await updateUserRole(usuarioId, rolIdFinal);

  // 4) Obtener nombre del rol desde la BD
  const rolNombre = await getRoleNameFromDb(rolIdFinal);

  const apMaternoProf = profesorData.apellido_materno ?? "";
  const nombreCompletoProfesor = `${profesorData.nombre} ${profesorData.apellido_paterno} ${apMaternoProf}`.trim();

  const user: User = {
    id: profesorData.id,              // id del profesor para la tabla de la vista
    profesorId: profesorData.id,
    usuarioId,
    nombre: nombreCompletoProfesor,
    email: profesorData.correo ?? correo, // usamos el correo que ya tenemos
    numEmpleado: profesorData.num_empleado,
    rol: rolNombre,
    rolId: rolIdFinal,
    imagen: null,
  };

  return user;
}


/**
 * Actualiza usuario + profesor + rol en la BD
 * y regresa el objeto User actualizado.
 */
export async function updateProfesor(
  input: UpdateProfesorInput
): Promise<User> {
  const { profesorId, usuarioId, nombreCompleto, correo, numEmpleado, rolId } =
    input;

  const rolIdFinal = rolId && rolId > 0 ? rolId : 3;

  const { nombre, apellido_paterno, apellido_materno } =
    splitNombreCompleto(nombreCompleto);

  // 1) Actualizar profesor
  const { data: profesorData, error: profesorError } = await supabase
    .from("profesor")
    .update({
      nombre,
      apellido_paterno,
      apellido_materno,
      correo,
      num_empleado: numEmpleado,
    })
    .eq("id", profesorId)
    .select("id, nombre, apellido_paterno, apellido_materno, correo, num_empleado")
    .single();

  if (profesorError || !profesorData) {
    console.error("Error al actualizar profesor:", profesorError);
    throw profesorError ?? new Error("No se pudo actualizar profesor");
  }

  // 2) Actualizar email de usuario
  const { error: usuarioError } = await supabase
    .from("usuario")
    .update({
      email: correo,
    })
    .eq("id", usuarioId);

  if (usuarioError) {
    console.error("Error al actualizar usuario:", usuarioError);
    throw usuarioError;
  }

  // 3) Actualizar rol
  await updateUserRole(usuarioId, rolIdFinal);

  // 4) Obtener nombre del rol desde la BD
  const rolNombre = await getRoleNameFromDb(rolIdFinal);

  const apMaternoProf = profesorData.apellido_materno ?? "";
  const nombreCompletoProfesor = `${profesorData.nombre} ${profesorData.apellido_paterno} ${apMaternoProf}`.trim();

  const user: User = {
    id: profesorData.id,
    profesorId: profesorData.id,
    usuarioId,
    nombre: nombreCompletoProfesor,
    email: profesorData.correo,
    numEmpleado: profesorData.num_empleado,
    rol: rolNombre,
    rolId: rolIdFinal,
    imagen: null,
  };

  return user;
}
