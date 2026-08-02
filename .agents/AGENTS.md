## Frontend Design Rules
- **Tabs Design:** Always use the following layout for tabs: a flex container with gap: '1rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', and buttons with padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === '...' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: ..., color: ....
- **Button Design:** Always copy the minimal styling of the 'personal global' action buttons (background tint depending on action, border with a matching tint). Do NOT use emojis in action buttons.

- **Button Order:** Always arrange action buttons in this exact order: `Editar`, then `Activar/Desactivar` (or `Suspender`), and finally `Eliminar` (or `Borrar`). The 'desactivar/suspender' button MUST always be next to the 'eliminar/borrar' button.

- **Image Uploads:** Whenever implementing image uploading for any module, ALWAYS reuse the `ImageUploader` component with the HTML5 Canvas + `react-easy-crop` architecture (resize to 600x600, WebP). Place it at the top of the form, above the name field, maintaining visual consistency with the rest of the app.

- **Details Modals Headers:** For titles inside "Detalles" modals, ALWAYS use clear and solid styling instead of faded colors (no `var(--text-muted)`). Use `color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'` to make them sharp and legible.
