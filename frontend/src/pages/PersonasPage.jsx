import { useMemo, useState } from "react";

import { useData } from "../context/DataContext";
import Modal from "../components/Modal";

export default function PersonasPage() {
  const { personas, addPersona, updatePersona, deletePersona, loading, error } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ nombre: "", telefono: "", activa: true });

  const activasCount = useMemo(
    () => personas.filter((persona) => persona.activa).length,
    [personas],
  );

  const inactivasCount = personas.length - activasCount;

  const handleOpenDialog = (persona) => {
    if (persona) {
      setEditingPersona(persona);
      setFormData({
        nombre: persona.nombre || "",
        telefono: persona.telefono || "",
        activa: Boolean(persona.activa),
      });
    } else {
      setEditingPersona(null);
      setFormData({ nombre: "", telefono: "", activa: true });
    }

    setIsDialogOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (editingPersona) {
        await updatePersona(editingPersona.id, formData);
      } else {
        await addPersona(formData);
      }

      setIsDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = (persona) => {
    updatePersona(persona.id, { ...persona, activa: !persona.activa });
  };

  if (loading) {
    return <StatusState title="Cargando personas..." description="Obteniendo datos reales desde el backend." />;
  }

  if (error) {
    return <StatusState title="No se pudo cargar personas" description={error} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Personas</h1>
          <p className="mt-1 text-gray-600">Gestiona las personas registradas en el backend</p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenDialog()}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700"
        >
          Nueva Persona
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MiniCard label="Activas" value={activasCount} valueClassName="text-green-600" />
        <MiniCard label="Inactivas" value={inactivasCount} valueClassName="text-gray-500" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900">Lista de Personas</h2>
          <p className="text-sm text-gray-500">Todas las personas registradas en el sistema</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Teléfono</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {personas.map((persona) => (
                <tr key={persona.id}>
                  <td className="px-5 py-4 font-medium text-gray-900">{persona.nombre}</td>
                  <td className="px-5 py-4 text-gray-600">{persona.telefono || "-"}</td>
                  <td className="px-5 py-4">
                    <span
                      className={[
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                        persona.activa ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800",
                      ].join(" ")}
                    >
                      {persona.activa ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex gap-2">
                      <ActionButton onClick={() => handleOpenDialog(persona)}>Editar</ActionButton>
                      <ActionButton onClick={() => handleToggleActive(persona)}>
                        {persona.activa ? "Desactivar" : "Activar"}
                      </ActionButton>
                      <ActionButton onClick={() => deletePersona(persona.id)}>Eliminar</ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingPersona ? "Editar Persona" : "Nueva Persona"}
        description={editingPersona ? "Modifica los datos de la persona" : "Ingresa los datos de la nueva persona"}
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field label="Nombre Completo" value={formData.nombre} onChange={(value) => setFormData({ ...formData, nombre: value })} placeholder="Ej: Juan Pérez" required />
          <Field label="Teléfono" value={formData.telefono} onChange={(value) => setFormData({ ...formData, telefono: value })} placeholder="555-0000" />

          <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formData.activa}
              onChange={(event) => setFormData({ ...formData, activa: event.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            Activa
          </label>

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setIsDialogOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? "Guardando..." : editingPersona ? "Guardar Cambios" : "Crear Persona"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function MiniCard({ label, value, valueClassName }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${valueClassName}`}>{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required = false }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function ActionButton({ children, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
      {children}
    </button>
  );
}

function StatusState({ title, description }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-gray-600">{description}</p>
    </div>
  );
}