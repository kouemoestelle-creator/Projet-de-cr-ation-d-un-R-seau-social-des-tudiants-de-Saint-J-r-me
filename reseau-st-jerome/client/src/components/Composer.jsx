import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { compressImage } from '../utils/compressImage.js';

export default function Composer({ onCreated }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  async function pick(e) {
    const chosen = e.target.files?.[0];
    e.target.value = '';
    if (!chosen) return;
    setError('');
    try {
      const small = await compressImage(chosen);
      setFile(small);
      setPreview(URL.createObjectURL(small));
    } catch (err) {
      setError(err.message);
    }
  }

  function removeImage() {
    setFile(null);
    setPreview(null);
  }

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setBusy(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('body', text);
      if (file) formData.append('image', file);
      const data = await api('/posts', { method: 'POST', formData });
      onCreated(data.post);
      setText('');
      removeImage();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card composer" onSubmit={submit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Quoi de neuf à Saint Jérôme ?"
        aria-label="Texte de la publication"
      />
      {preview && (
        <div className="preview">
          <img src={preview} alt="Aperçu de l’image" />
          <button type="button" className="link-button" onClick={removeImage}>Retirer l’image</button>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row between">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png" onChange={pick} hidden />
        <button type="button" className="btn btn-light" onClick={() => fileInput.current.click()}>
          Ajouter une image
        </button>
        <button className="btn" disabled={busy || (!text.trim() && !file)}>
          {busy ? 'Publication…' : 'Publier'}
        </button>
      </div>
    </form>
  );
}
