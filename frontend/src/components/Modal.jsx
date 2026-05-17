export default function Modal({ open, title, description, children, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="modal-scrollbar w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
        <div className="max-h-[calc(100vh-3rem)] overflow-y-auto p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Cerrar
          </button>
        </div>

          {children}
        </div>
      </div>
    </div>
  );
}