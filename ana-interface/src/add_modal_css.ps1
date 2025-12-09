$file = 'E:/ANA/ana-interface/src/pages/FeedbackPage.css'
$content = Get-Content $file -Raw -Encoding UTF8

$modalCSS = @'

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-secondary, #2d2d2d);
  border-radius: 12px;
  border: 1px solid var(--border-color, #404040);
  padding: 1.5rem;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.modal-header h3 {
  margin: 0;
  color: var(--text-primary, #fff);
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-secondary, #888);
  cursor: pointer;
  font-size: 1.5rem;
  padding: 0;
  line-height: 1;
}

.modal-close:hover {
  color: var(--text-primary, #fff);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  color: var(--text-secondary, #888);
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 0.75rem;
  background: var(--bg-tertiary, #1a1a1a);
  border: 1px solid var(--border-color, #404040);
  border-radius: 8px;
  color: var(--text-primary, #fff);
  font-size: 0.875rem;
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--accent-color, #3b82f6);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent-color, #3b82f6);
  border: none;
  color: #fff;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-color, #404040);
  color: var(--text-primary, #fff);
}

.btn-secondary:hover {
  background: var(--bg-hover, #3d3d3d);
}

.btn-danger {
  background: #ef4444;
  border: none;
  color: #fff;
}

.btn-danger:hover {
  background: #dc2626;
}

/* Pattern Action Buttons */
.pattern-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.pattern-actions button {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit {
  background: var(--bg-secondary, #2d2d2d);
  border: 1px solid var(--border-color, #404040);
  color: var(--text-primary, #fff);
}

.btn-edit:hover {
  background: var(--accent-color, #3b82f6);
  border-color: var(--accent-color, #3b82f6);
}

.btn-delete {
  background: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
}

.btn-delete:hover {
  background: #ef4444;
  color: #fff;
}

/* Add Button in Section Header */
.btn-add {
  padding: 0.25rem 0.75rem;
  background: #22c55e;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-add:hover {
  background: #16a34a;
}

.pattern-count {
  font-size: 0.875rem;
  color: var(--text-secondary, #888);
  margin-right: 0.5rem;
}
'@

$content = $content + $modalCSS
Set-Content $file -Value $content -NoNewline -Encoding UTF8
Write-Host 'Modal CSS added successfully'
